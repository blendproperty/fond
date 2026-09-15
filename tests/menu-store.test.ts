import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.FOND_DB_PATH = ':memory:';
let resetDbForTests: () => void;
let getFullMenu: typeof import('../src/lib/menu-store').getFullMenu;
let getAvailableMenu: typeof import('../src/lib/menu-store').getAvailableMenu;
let updateMenuItem: typeof import('../src/lib/menu-store').updateMenuItem;
let createMenuItem: typeof import('../src/lib/menu-store').createMenuItem;
let deleteMenuItem: typeof import('../src/lib/menu-store').deleteMenuItem;
let MenuValidationError: typeof import('../src/lib/menu-store').MenuValidationError;
let getDb: typeof import('../src/lib/db').getDb;

before(async () => {
  ({ resetDbForTests, getDb } = await import('../src/lib/db'));
  ({ getFullMenu, getAvailableMenu, updateMenuItem, createMenuItem, deleteMenuItem, MenuValidationError } = await import('../src/lib/menu-store'));
});

beforeEach(() => resetDbForTests());

test('seeds from SEED_MENU on first read and is idempotent', () => {
  const first = getFullMenu();
  assert.ok(first.length > 50);
  const second = getFullMenu();
  assert.equal(second.length, first.length);
});

test('published modifier defaults appear once and admin can remove them', () => {
  const menu = getFullMenu();
  const smoothie = menu.find(item => item.id === 'tropical-gold')!;
  assert.equal(smoothie.modifiers?.find(mod => mod.name === 'Add protein powder')?.price, 3000);
  const burger = menu.find(item => item.id === 'fond-smashburger')!;
  assert.equal(burger.modifiers?.find(mod => mod.name === 'No cheddar')?.price, 0);
  updateMenuItem(burger.id, {modifiers: []});
  assert.deepEqual(getFullMenu().find(item => item.id === burger.id)?.modifiers, []);
});

test('existing menu migration fills only empty items and preserves admin options', () => {
  getFullMenu();
  const custom = [{id:'house-choice',name:'House choice',price:500}];
  const db = getDb();
  db.prepare('DELETE FROM app_documents WHERE key = ?').run('menu-launch-modifiers-v1');
  db.prepare('UPDATE menu_items SET modifiers_json = ? WHERE id = ?').run('[]','tropical-gold');
  db.prepare('UPDATE menu_items SET modifiers_json = ? WHERE id = ?').run(JSON.stringify(custom),'smashed-avo');
  db.prepare('UPDATE menu_items SET description = ?, modifiers_json = ? WHERE id = ?').run('Kitchen-specific toastie recipe','[]','toastie-cheddar-tomato');
  const menu = getFullMenu();
  assert.ok(menu.find(item => item.id === 'tropical-gold')?.modifiers?.length);
  assert.deepEqual(menu.find(item => item.id === 'smashed-avo')?.modifiers, custom);
  assert.deepEqual(menu.find(item => item.id === 'toastie-cheddar-tomato')?.modifiers, []);
});

test('unavailable items are hidden from the available menu but kept in the full menu', () => {
  const [item] = getFullMenu();
  updateMenuItem(item.id, { available: false });
  assert.equal(getAvailableMenu().find((m) => m.id === item.id), undefined);
  assert.ok(getFullMenu().find((m) => m.id === item.id));
});

test('marking an item as a special changes its effective price and exposes the base price', () => {
  const [item] = getFullMenu();
  const updated = updateMenuItem(item.id, { isSpecial: true, specialPrice: 1, specialLabel: 'Today only' });
  assert.equal(updated.price, 1);
  assert.equal(updated.basePrice, item.price);
  assert.equal(updated.specialLabel, 'Today only');
  assert.equal(getAvailableMenu().find((m) => m.id === item.id)?.price, 1);
});

test('rejects a special price higher than the normal price', () => {
  const [item] = getFullMenu();
  assert.throws(() => updateMenuItem(item.id, { isSpecial: true, specialPrice: item.price + 100_00 }), MenuValidationError);
});

test('creating a new item derives a slug id and rejects a duplicate', () => {
  const created = createMenuItem({ id: 'Winter Toastie!', name: 'Winter Toastie', description: 'Seasonal', category: 'Sandwiches', price: 6500 });
  assert.equal(created.id, 'winter-toastie');
  assert.equal(created.price, 6500);
  assert.throws(() => createMenuItem({ id: 'Winter Toastie!', name: 'Winter Toastie', description: '', category: 'Sandwiches', price: 6500 }), MenuValidationError);
});

test('deleting an item removes it from both the full and available menu', () => {
  const created = createMenuItem({ id: 'temp-item', name: 'Temp Item', description: '', category: 'Sides, Sauces & Add-Ons', price: 1000 });
  deleteMenuItem(created.id);
  assert.equal(getFullMenu().find((m) => m.id === created.id), undefined);
});
