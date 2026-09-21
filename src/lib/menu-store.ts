import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { SEED_MENU, PUBLISHED_FOOD_MENU, type Meal, type Category, type Modifier } from './menu';
import { RETIRED_FOOD_MENU_IDS } from './published-food-menu';
import { DEFAULT_MENU_MODIFIERS } from './menu-modifier-defaults';
import {estimatedPrepMinutes} from './preparation-estimates';

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
  modifiers_json: string;
  prep_minutes:number;
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
    modifiers: JSON.parse(row.modifiers_json || '[]'),
    prepMinutes:row.prep_minutes,
  };
}

function seedIfEmpty() {
  const db = getDb();
  const { count } = db.prepare(`SELECT COUNT(*) AS count FROM menu_items`).get() as { count: number };
  if (count === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(
      `INSERT INTO menu_items (id, name, description, category, price_cents, diet_json, symbol, sort_order, available, is_special, special_label, special_price_cents, prep_minutes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NULL, NULL, ?, ?)`,
    );
    SEED_MENU.forEach((meal, index) => {
      insert.run(meal.id, meal.name, meal.description, meal.category, meal.price, JSON.stringify(meal.diet ?? []), meal.symbol, index, estimatedPrepMinutes(meal), now);
    });
  }
  const timingMarker='menu-preparation-estimates-v1';
  if(!db.prepare('SELECT key FROM app_documents WHERE key=?').get(timingMarker)){
    const update=db.prepare('UPDATE menu_items SET prep_minutes=?,updated_at=? WHERE id=?');const now=new Date().toISOString();
    for(const item of SEED_MENU)update.run(estimatedPrepMinutes(item),now,item.id);
    db.prepare('INSERT INTO app_documents (key,value,updated_at) VALUES (?,?,?)').run(timingMarker,'research-seeded',now);
  }
  // Apply the published launch choices once to existing menus, filling only
  // items that still have no admin-configured modifiers. The marker prevents
  // an admin intentionally clearing an item from being overwritten later.
  const marker = 'menu-launch-modifiers-v1';
  if (!db.prepare('SELECT key FROM app_documents WHERE key = ?').get(marker)) {
    db.exec('SAVEPOINT fond_menu_defaults');
    try {
      const now = new Date().toISOString();
      const update = db.prepare(`UPDATE menu_items SET modifiers_json = ?, updated_at = ? WHERE id = ? AND description = ? AND modifiers_json = '[]'`);
      for (const [id, modifiers] of Object.entries(DEFAULT_MENU_MODIFIERS)) {
        const original = SEED_MENU.find(item => item.id === id);
        if (original) update.run(JSON.stringify(modifiers), now, id, original.description);
      }
      db.prepare('INSERT INTO app_documents (key, value, updated_at) VALUES (?, ?, ?)').run(marker, 'applied', now);
      db.exec('RELEASE fond_menu_defaults');
    } catch (error) {
      db.exec('ROLLBACK TO fond_menu_defaults');
      db.exec('RELEASE fond_menu_defaults');
      throw error;
    }
  }

  // Replace the published food range once on every existing database while
  // leaving the separately supplied beverage catalogue and any admin-created
  // items untouched. Retired rows are hidden rather than deleted so historic
  // orders and reports can still resolve their original item ids.
  const foodMenuMarker = 'published-food-menu-2026-09-21-v1';
  if (!db.prepare('SELECT key FROM app_documents WHERE key = ?').get(foodMenuMarker)) {
    db.exec('SAVEPOINT fond_food_menu_20260921');
    try {
      const now = new Date().toISOString();
      const upsert = db.prepare(`
        INSERT INTO menu_items
          (id, name, description, category, price_cents, diet_json, symbol, sort_order, available, is_special, special_label, special_price_cents, modifiers_json, prep_minutes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NULL, NULL, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          category = excluded.category,
          price_cents = excluded.price_cents,
          diet_json = excluded.diet_json,
          symbol = excluded.symbol,
          sort_order = excluded.sort_order,
          available = 1,
          is_special = 0,
          special_label = NULL,
          special_price_cents = NULL,
          modifiers_json = excluded.modifiers_json,
          prep_minutes = excluded.prep_minutes,
          updated_at = excluded.updated_at
      `);
      PUBLISHED_FOOD_MENU.forEach((meal, index) => {
        upsert.run(
          meal.id,
          meal.name,
          meal.description,
          meal.category,
          meal.price,
          JSON.stringify(meal.diet ?? []),
          meal.symbol,
          index,
          JSON.stringify(DEFAULT_MENU_MODIFIERS[meal.id] ?? []),
          estimatedPrepMinutes(meal),
          now,
        );
      });
      const retire = db.prepare(`UPDATE menu_items SET available = 0, is_special = 0, special_label = NULL, special_price_cents = NULL, updated_at = ? WHERE id = ?`);
      for (const id of RETIRED_FOOD_MENU_IDS) retire.run(now, id);
      db.prepare('INSERT INTO app_documents (key, value, updated_at) VALUES (?, ?, ?)').run(foodMenuMarker, 'applied', now);
      db.exec('RELEASE fond_food_menu_20260921');
    } catch (error) {
      db.exec('ROLLBACK TO fond_food_menu_20260921');
      db.exec('RELEASE fond_food_menu_20260921');
      throw error;
    }
  }
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
  modifiers: Modifier[]; // full replacement list
  prepMinutes:number;
}>;

export class MenuValidationError extends Error {}

function validateModifiers(modifiers: Modifier[] | undefined): string | undefined {
  if (modifiers === undefined) return undefined;
  if (!Array.isArray(modifiers) || modifiers.length > 20) throw new MenuValidationError('Too many modifiers.');
  for (const m of modifiers) {
    if (!m || typeof m.id !== 'string' || typeof m.name !== 'string' || !m.name.trim() || m.name.length > 60) {
      throw new MenuValidationError('Each modifier needs a name.');
    }
    if (!Number.isInteger(m.price) || m.price < -100_00 || m.price > 100_00) {
      throw new MenuValidationError('Modifier price must be a valid amount (can be negative, e.g. "no cheese").');
    }
  }
  return JSON.stringify(modifiers);
}

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
  const modifiersJson = validateModifiers(patch.modifiers) ?? row.modifiers_json;
  const prepMinutes=patch.prepMinutes??row.prep_minutes;
  if(!Number.isInteger(prepMinutes)||prepMinutes<1||prepMinutes>240)throw new MenuValidationError('Preparation time must be between 1 and 240 minutes.');
  const updatedAt = new Date().toISOString();

  db.prepare(
    `UPDATE menu_items SET name = ?, description = ?, category = ?, price_cents = ?, diet_json = ?, symbol = ?, available = ?, is_special = ?, special_label = ?, special_price_cents = ?, modifiers_json = ?, prep_minutes=?, updated_at = ? WHERE id = ?`,
  ).run(name, description, category, priceCents, dietJson, symbol, available ? 1 : 0, isSpecial ? 1 : 0, specialLabel, specialPriceCents, modifiersJson,prepMinutes, updatedAt, id);

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
  prepMinutes?:number;
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
    `INSERT INTO menu_items (id, name, description, category, price_cents, diet_json, symbol, sort_order, available, is_special, special_label, special_price_cents, prep_minutes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NULL, NULL, ?, ?)`,
  ).run(id, name, description, input.category, input.price, JSON.stringify(input.diet ?? []), input.symbol || '🍽️', max + 1,input.prepMinutes??estimatedPrepMinutes({id,category:input.category}), now);
  return fromRow(db.prepare(`SELECT * FROM menu_items WHERE id = ?`).get(id) as MenuRow);
}

export function deleteMenuItem(id: string): void {
  seedIfEmpty();
  getDb().prepare(`DELETE FROM menu_items WHERE id = ?`).run(id);
}

// Add a single "add this / remove this" option to an item, e.g. "Extra
// cheese" at +R15, or "No onion" at R0 — the price can be negative for a
// removal that should discount (rare, but the field allows it).
export function addModifier(itemId: string, input: { name: string; price: number }): Meal {
  const item = getFullMenu().find((m) => m.id === itemId);
  if (!item) throw new MenuValidationError('Menu item not found.');
  const modifiers = [...(item.modifiers ?? []), { id: randomUUID(), name: input.name, price: input.price }];
  return updateMenuItem(itemId, { modifiers });
}

export function removeModifier(itemId: string, modifierId: string): Meal {
  const item = getFullMenu().find((m) => m.id === itemId);
  if (!item) throw new MenuValidationError('Menu item not found.');
  const modifiers = (item.modifiers ?? []).filter((m) => m.id !== modifierId);
  return updateMenuItem(itemId, { modifiers });
}

// Aggregates quantity sold per menu item across all non-cancelled orders —
// backs the admin "top / slow movers" report. Cancelled orders are excluded
// so a rejected order never counts as a sale. Only quantity is tracked here:
// orders store the raw basket (id/quantity), not a per-line price snapshot,
// so per-item revenue isn't reconstructable from lines_json alone.
export function getItemSalesStats(): Map<string, number> {
  const db = getDb();
  const rows = db.prepare(`SELECT lines_json FROM orders WHERE status = 'completed'`).all() as { lines_json: string }[];
  const stats = new Map<string, number>();
  for (const row of rows) {
    let lines: { id: string; quantity: number }[];
    try {
      lines = JSON.parse(row.lines_json);
    } catch {
      continue;
    }
    for (const line of lines ?? []) {
      if (!line || typeof line.id !== 'string' || !Number.isFinite(line.quantity)) continue;
      stats.set(line.id, (stats.get(line.id) ?? 0) + line.quantity);
    }
  }
  return stats;
}
