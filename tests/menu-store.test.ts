import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.FOND_DB_PATH = ':memory:';
let resetDbForTests: () => void;
let getFullMenu: typeof import('../src/lib/menu-store').getFullMenu;
let getAvailableMenu: typeof import('../src/lib/menu-store').getAvailableMenu;
let updateMenuItem: typeof import('../src/lib/menu-store').updateMenuItem;
let createMenuItem: typeof import('../src/lib/menu-store').createMenuItem;
let deleteMenuItem: typeof import('../src/lib/menu-store').deleteMenuItem;
let addModifier: typeof import('../src/lib/menu-store').addModifier;
let removeModifier: typeof import('../src/lib/menu-store').removeModifier;
let MenuValidationError: typeof import('../src/lib/menu-store').MenuValidationError;
let getDb: typeof import('../src/lib/db').getDb;

before(async () => {
  ({ resetDbForTests, getDb } = await import('../src/lib/db'));
  ({ getFullMenu, getAvailableMenu, updateMenuItem, createMenuItem, deleteMenuItem, addModifier, removeModifier, MenuValidationError } = await import('../src/lib/menu-store'));
});

beforeEach(() => resetDbForTests());

test('seeds from SEED_MENU on first read and is idempotent', () => {
  const first = getFullMenu();
  assert.ok(first.length > 50);
  const second = getFullMenu();
  assert.equal(second.length, first.length);
});

test('seeds editable research estimates once and preserves later admin changes', () => {
  const menu = getFullMenu();
  assert.equal(menu.find(item => item.id === 'espresso-single')?.prepMinutes, 3);
  assert.equal(menu.find(item => item.id === 'rump-350')?.prepMinutes, 20);
  assert.equal(menu.find(item => item.id === 'classic-margherita-pizza')?.prepMinutes, 15);
  assert.ok(menu.every(item => Number.isInteger(item.prepMinutes) && item.prepMinutes! >= 1 && item.prepMinutes! <= 240));
  updateMenuItem('espresso-single', {prepMinutes: 6});
  assert.equal(getFullMenu().find(item => item.id === 'espresso-single')?.prepMinutes, 6);
  assert.throws(() => updateMenuItem('espresso-single', {prepMinutes: 0}), MenuValidationError);
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

test('photographed 2026-10-08 food menu replaces legacy food once and preserves beverages and custom items', () => {
  getFullMenu();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('DELETE FROM app_documents WHERE key = ?').run('published-food-menu-2026-10-08-photo-v1');
  db.prepare('DELETE FROM menu_items WHERE id = ?').run('golden-goddess-bowl');
  db.prepare('UPDATE menu_items SET price_cents = ? WHERE id = ?').run(99900, 'smashed-avo');
  db.prepare('UPDATE menu_items SET price_cents = ? WHERE id = ?').run(5100, 'espresso-single');
  db.prepare(`INSERT INTO menu_items (id,name,description,category,price_cents,diet_json,symbol,sort_order,available,is_special,special_label,special_price_cents,modifiers_json,prep_minutes,updated_at) VALUES (?,?,?,?,?,?,?,?,1,0,NULL,NULL,'[]',?,?)`)
    .run('rump-250', 'Legacy Rump', 'Old size', 'The Grill', 18000, '[]', '🥩', 0, 18, now);
  db.prepare(`INSERT INTO menu_items (id,name,description,category,price_cents,diet_json,symbol,sort_order,available,is_special,special_label,special_price_cents,modifiers_json,prep_minutes,updated_at) VALUES (?,?,?,?,?,?,?,?,1,0,NULL,NULL,'[]',?,?)`)
    .run('chef-weekly-special', 'Chef Weekly Special', 'Admin-created item', 'Plates', 12300, '[]', '🍽️', 999, 12, now);

  const menu = getFullMenu();
  assert.equal(menu.find(item => item.id === 'smashed-avo')?.price, 12000);
  assert.equal(menu.find(item => item.id === 'golden-goddess-bowl')?.price, 12000);
  assert.equal(menu.find(item => item.id === 'rump-250')?.available, false);
  assert.equal(menu.find(item => item.id === 'espresso-single')?.price, 5100);
  assert.equal(menu.find(item => item.id === 'chef-weekly-special')?.price, 12300);

  updateMenuItem('smashed-avo', { price: 12100 });
  assert.equal(getFullMenu().find(item => item.id === 'smashed-avo')?.price, 12100);
});

test('food truck menu is added once to existing databases without overwriting later admin edits', () => {
  getFullMenu();
  const db = getDb();
  db.prepare('DELETE FROM app_documents WHERE key = ?').run('food-truck-menu-2026-09-25-v1');
  db.prepare('DELETE FROM menu_items WHERE id = ?').run('truck-kota-steak');
  db.prepare('UPDATE menu_items SET price_cents = ? WHERE id = ?').run(3100, 'truck-kota-vienna');

  const menu = getFullMenu();
  const foodTruck = menu.filter(item => item.category === 'Food Truck');
  assert.equal(foodTruck.length, 26);
  assert.equal(menu.find(item => item.id === 'truck-kota-steak')?.price, 7000);
  assert.equal(menu.find(item => item.id === 'truck-kota-vienna')?.price, 3100);
  assert.equal(menu.find(item => item.id === 'truck-kota-russian')?.modifiers?.[0]?.name, 'Kota: Atchar');
  assert.equal(menu.find(item => item.id === 'truck-kota-create-your-own')?.available, false);
  assert.equal(getAvailableMenu().find(item => item.id === 'truck-kota-create-your-own'), undefined);
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
  const created = createMenuItem({ id: 'Winter Toastie!', name: 'Winter Toastie', description: 'Seasonal', category: 'Sandwiches', price: 6500, prepMinutes: 9 });
  assert.equal(created.id, 'winter-toastie');
  assert.equal(created.price, 6500);
  assert.equal(created.prepMinutes, 9);
  assert.throws(() => createMenuItem({ id: 'Winter Toastie!', name: 'Winter Toastie', description: '', category: 'Sandwiches', price: 6500 }), MenuValidationError);
});

test('deleting an item removes it from both the full and available menu', () => {
  const created = createMenuItem({ id: 'temp-item', name: 'Temp Item', description: '', category: 'Sides, Sauces & Add-Ons', price: 1000 });
  deleteMenuItem(created.id);
  assert.equal(getFullMenu().find((m) => m.id === created.id), undefined);
});

test('photographed food menu matches every transcribed price and breakfast/quesadilla extra',async()=>{
 const {readFileSync}=await import('node:fs');
 const reference=JSON.parse(readFileSync(new URL('../docs/menu/food-menu-reference-2026-10-08.json',import.meta.url),'utf8'));
 const {PUBLISHED_FOOD_MENU}=await import('../src/lib/published-food-menu');
 assert.deepEqual(Object.fromEntries(PUBLISHED_FOOD_MENU.map(m=>[m.id,m.price])),reference.pricesCents);
 const menu=getFullMenu();
 for(const item of menu.filter(m=>m.category==='All-Day Breakfast'||m.id==='quesadilla')){
  const extras=Object.fromEntries(item.modifiers!.filter(m=>m.name.startsWith('Add ')).map(m=>[m.name,m.price]));
  assert.deepEqual(extras,reference.breakfastAndQuesadillaExtrasCents);
 }
 for(const id of reference.removeFromSale)assert.ok(!getAvailableMenu().some(m=>m.id===id));
 assert.match(menu.find(m=>m.id==='green-caesar-salad')!.description,/chicken/);
 assert.ok(!menu.find(m=>m.id==='green-caesar-salad')!.diet?.includes('vegetarian'));
 assert.match(menu.find(m=>m.id==='salmon-poke')!.description,/Smoked salmon trout/);
 assert.match(menu.find(m=>m.id==='brekkie-bun')!.description,/mayonnaise.*chips/);
 assert.ok(!menu.find(m=>m.id==='brekkie-bun')!.modifiers?.some(m=>/mustard/.test(m.name)));
 assert.equal(menu.filter(m=>m.category==='Pasta').length,3);
});

test('photo reconciliation updates an existing database once and preserves sold-out status, timing and history',async()=>{
 const {createOrder,getOrderByReference}=await import('../src/lib/orders');
 getFullMenu();
 const db=getDb(),now=new Date().toISOString();
 const snapshot=db.prepare('SELECT * FROM menu_items WHERE id=?').get('espresso-single');
 db.prepare('DELETE FROM app_documents WHERE key=?').run('published-food-menu-2026-10-08-photo-v1');
 db.prepare('DELETE FROM menu_items WHERE id=?').run('three-egg-omelette');
 db.prepare('UPDATE menu_items SET available=0,prep_minutes=27,price_cents=1 WHERE id=?').run('brekkie-bun');
 db.prepare(`INSERT INTO menu_items (id,name,description,category,price_cents,diet_json,symbol,sort_order,available,is_special,special_label,special_price_cents,modifiers_json,prep_minutes,updated_at) VALUES (?,?,?,?,?,?,?,?,1,0,NULL,NULL,'[]',?,?)`)
  .run('grilled-lamb-chops','Grilled Lamb Chops','Historical recipe','Plates',16000,'[]','plate',0,18,now);
 // The old menu is present before the new migration, including an actual order snapshot.
 db.prepare('INSERT INTO app_documents VALUES (?,?,?)').run('published-food-menu-2026-10-08-photo-v1','pending-fixture',now);
 const old=createOrder({customerName:'Historical fixture',contactNumber:'0821234567',collectionTime:'ASAP',source:'staff',lines:[{id:'grilled-lamb-chops',quantity:1}]});
 db.prepare('DELETE FROM app_documents WHERE key=?').run('published-food-menu-2026-10-08-photo-v1');
 const menu=getFullMenu();
 assert.equal(menu.find(m=>m.id==='three-egg-omelette')?.price,5500);
 assert.equal(menu.find(m=>m.id==='brekkie-bun')?.available,false);
 assert.equal(menu.find(m=>m.id==='brekkie-bun')?.prepMinutes,27);
 assert.equal(menu.find(m=>m.id==='brekkie-bun')?.price,9500);
 assert.equal(menu.find(m=>m.id==='grilled-lamb-chops')?.available,false);
 assert.deepEqual(db.prepare('SELECT * FROM menu_items WHERE id=?').get('espresso-single'),snapshot);
 assert.equal(getOrderByReference(old.reference)?.lines[0].name,'Grilled Lamb Chops');
 assert.equal(getOrderByReference(old.reference)?.totalCents,16000);
 updateMenuItem('three-egg-omelette',{price:5600});
 assert.equal(getFullMenu().find(m=>m.id==='three-egg-omelette')?.price,5600);
});

test('Food Truck preferences migrate once without changing prices, availability, custom options or other menus', () => {
  const before = getFullMenu();
  const db = getDb();
  db.prepare('DELETE FROM app_documents WHERE key=?').run('food-truck-options-2026-10-27-v1');
  const legacy = [{id:'achar-instead-of-chakalaka',name:'Achar instead of chakalaka',price:0},{id:'custom-extra',name:'Kitchen extra',price:500}];
  db.prepare('UPDATE menu_items SET modifiers_json=?,price_cents=3333,available=0 WHERE id=?').run(JSON.stringify(legacy),'truck-kota-vienna');
  const migrated = getFullMenu();
  const kota = migrated.find(item => item.id === 'truck-kota-vienna')!;
  assert.equal(kota.price,3333); assert.equal(kota.available,false);
  assert.equal(kota.modifiers?.length,11);
  assert.ok(kota.modifiers?.some(mod=>mod.id==='custom-extra'&&mod.price===500));
  assert.equal(kota.modifiers?.filter(mod=>mod.choiceGroup==='Kota relish').length,3);
  assert.deepEqual(migrated.filter(item=>item.category!=='Food Truck'),before.filter(item=>item.category!=='Food Truck'));
  for (const item of migrated.filter(item=>item.id.startsWith('truck-chow-')||item.id.startsWith('truck-breakfast-')||/^truck-side-(small|medium|large)-chips$/.test(item.id))) assert.equal(item.modifiers?.length,7);
  updateMenuItem(kota.id,{modifiers:[]});
  assert.deepEqual(getFullMenu().find(item=>item.id===kota.id)?.modifiers,[]);
});

test('self-service modifiers persist optional prices and required groups with boundary validation', () => {
  const item=createMenuItem({id:'self-service-options',name:'Options fixture',description:'',category:'Food Truck',price:1000});
  addModifier(item.id,{name:'BBQ',price:0});
  addModifier(item.id,{name:'White bread',price:0,choiceGroup:' Bread choice '});
  const saved=addModifier(item.id,{name:'Brown bread',price:500,choiceGroup:'Bread choice'});
  assert.equal(saved.modifiers?.filter(mod=>mod.choiceGroup==='Bread choice').length,2);
  assert.equal(saved.modifiers?.find(mod=>mod.name==='BBQ')?.choiceGroup,undefined);
  for(const choiceGroup of ['', ' ', 'x'.repeat(61), 123, null]) assert.throws(()=>addModifier(item.id,{name:'Bad',price:0,choiceGroup:choiceGroup as any}),MenuValidationError);
  assert.equal(getFullMenu().find(mod=>mod.id===item.id)?.modifiers?.length,3);
  const removed=removeModifier(item.id,saved.modifiers!.find(mod=>mod.name==='Brown bread')!.id);
  assert.equal(removed.modifiers?.length,2);
});
