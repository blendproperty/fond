import { getDb } from './db';
import { SEED_MENU, type Meal, type Category } from './menu';

// Live, editable menu (2026-09-14 later addition — the admin/CRM backend).
// The menu_items table is seeded once from SEED_MENU the first time it's
// empty; from then on this file, not src/lib/menu.ts, is the source of
// truth read by every route. Admins change price/availability/specials
// through /admin, which writes here directly.

type MenuRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  diet_json: string;
  symbol: string;
  sort_order: number;
  available: number;
  is_special: number;
  special_label: string | null;
  special_price_cents: number | null;
  updated_at: string;
};

function fromRow(row: MenuRow): Meal {
  const basePrice = row.price_cents;
  const isSpecial = !!row.is_special;
  const effectivePrice = isSpecial && row.special_price_cents != null ? row.special_price_cents : basePrice;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as Category,
    price: effectivePrice,
    diet: JSON.parse(row.diet_json || '[]'),
    symbol: row.symbol,
    available: !!row.available,
    isSpecial,
    specialLabel: row.special_label,
    basePrice: isSpecial && row.special_price_cents != null ? basePrice : undefined,
  };
}

function seedIfEmpty() {
  const db = getDb();
  const { count } = db.prepare(`SELECT COUNT(*) AS count FROM menu_items`).get() as { count: number };
  if (count > 0) return;
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO menu_items (id, name, description, category, price_cents, diet_json, symbol, sort_order, available, is_special, special_label, special_price_cents, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NULL, NULL, ?)`,
  );
  SEED_MENU.forEach((meal, index) => {
    insert.run(meal.id, meal.name, meal.description, meal.category, meal.price, JSON.stringify(meal.diet ?? []), meal.symbol, index, now);
  });
}

// Full menu including unavailable items — for the admin panel only.
export function getFullMenu(): Meal[] {
  seedIfEmpty();
  const rows = getDb().prepare(`SELECT * FROM menu_items ORDER BY category, sort_order, name`).all() as MenuRow[];
  return rows.map(fromRow);
}

// Customer/staff-facing menu — unavailable items hidden. This is what
// pricing is quoted against, so an item taken off the menu can never be
// ordered even if a client still has it cached.
export function getAvailableMenu(): Meal[] {
  return getFullMenu().filter((m) => m.available !== false);
}

export type MenuItemPatch = Partial<{
  name: string;
  description: string;
  category: Category;
  price: number; // cents, base price
  available: boolean;
  isSpecial: boolean;
  specialLabel: string | null;
  specialPrice: number | null; // cents, or null to clear
  diet: Meal['diet'];
  symbol: string;
}>;

export class MenuValidationError extends Error {}

export function updateMenuItem(id: string, patch: MenuItemPatch): Meal {
  seedIfEmpty();
  const db = getDb();
  const row = db.prepare(`SELECT * FROM menu_items WHERE id = ?`).get(id) as MenuRow | undefined;
  if (!row) throw new MenuValidationError('Menu item not found.');

  const name = patch.name !== undefined ? patch.name.trim() : row.name;
  if (!name || name.length > 120) throw new MenuValidationError('Name must be 1-120 characters.');
  const description = patch.description !== undefined ? patch.description.trim() : row.description;
  if (description.length > 500) throw new MenuValidationError('Description is too long.');
  const category = patch.category !== undefined ? patch.category : (row.category as Category);
  const priceCents = patch.price !== undefined ? patch.price : row.price_cents;
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 10_000_00) throw new MenuValidationError('Enter a valid price.');
  const available = patch.available !== undefined ? patch.available : !!row.available;
  const isSpecial = patch.isSpecial !== undefined ? patch.isSpecial : !!row.is_special;
  const specialLabel = patch.specialLabel !== undefined ? (patch.specialLabel?.trim() || null) : row.special_label;
  if (specialLabel && specialLabel.length > 40) throw new MenuValidationError('Special label is too long.');
  const specialPriceCents = patch.specialPrice !== undefined ? patch.specialPrice : row.special_price_cents;
  if (specialPriceCents != null && (!Number.isInteger(specialPriceCents) || specialPriceCents < 0 || specialPriceCents > priceCents)) {
    throw new MenuValidationError('Special price must be a valid amount not higher than the normal price.');
  }
  const dietJson = patch.diet !== undefined ? JSON.stringify(patch.diet ?? []) : row.diet_json;
  const symbol = patch.symbol !== undefined ? patch.symbol : row.symbol;
  const updatedAt = new Date().toISOString();

  db.prepare(
    `UPDATE menu_items SET name = ?, description = ?, category = ?, price_cents = ?, diet_json = ?, symbol = ?, available = ?, is_special = ?, special_label = ?, special_price_cents = ?, updated_at = ? WHERE id = ?`,
  ).run(name, description, category, priceCents, dietJson, symbol, available ? 1 : 0, isSpecial ? 1 : 0, specialLabel, specialPriceCents, updatedAt, id);

  return fromRow(db.prepare(`SELECT * FROM menu_items WHERE id = ?`).get(id) as MenuRow);
}

export function createMenuItem(input: {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  symbol?: string;
  diet?: Meal['diet'];
}): Meal {
  seedIfEmpty();
  const db = getDb();
  const id = input.id.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  if (!id) throw new MenuValidationError('Could not derive a valid id for this item.');
  const existing = db.prepare(`SELECT id FROM menu_items WHERE id = ?`).get(id);
  if (existing) throw new MenuValidationError('An item with that id already exists.');
  const name = input.name.trim();
  if (!name || name.length > 120) throw new MenuValidationError('Name must be 1-120 characters.');
  const description = input.description.trim();
  if (description.length > 500) throw new MenuValidationError('Description is too long.');
  if (!Number.isInteger(input.price) || input.price < 0 || input.price > 10_000_00) throw new MenuValidationError('Enter a valid price.');
  const now = new Date().toISOString();
  const { max } = db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max FROM menu_items WHERE category = ?`).get(input.category) as { max: number };
  db.prepare(
    `INSERT INTO menu_items (id, name, description, category, price_cents, diet_json, symbol, sort_order, available, is_special, special_label, special_price_cents, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NULL, NULL, ?)`,
  ).run(id, name, description, input.category, input.price, JSON.stringify(input.diet ?? []), input.symbol || '🍽️', max + 1, now);
  return fromRow(db.prepare(`SELECT * FROM menu_items WHERE id = ?`).get(id) as MenuRow);
}

export function deleteMenuItem(id: string): void {
  seedIfEmpty();
  getDb().prepare(`DELETE FROM menu_items WHERE id = ?`).run(id);
}
