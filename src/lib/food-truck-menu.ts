import type { Meal } from './menu';

export const FOOD_TRUCK_SECTIONS = ['Build Your Plate', 'Kotas', 'Chow for 1', 'Breakfast'] as const;
export type FoodTruckSection = (typeof FOOD_TRUCK_SECTIONS)[number];

export function foodTruckSection(item: Pick<Meal, 'id'>): FoodTruckSection {
  if (item.id.startsWith('truck-kota-')) return 'Kotas';
  if (item.id.startsWith('truck-chow-')) return 'Chow for 1';
  if (item.id.startsWith('truck-breakfast-')) return 'Breakfast';
  return 'Build Your Plate';
}

// Food-truck menu supplied as FOND_Shisa Nyama_Truck Menu_V6_ 28 April.pdf
// on 2026-09-25. Prices are fixed Rand amounts stored in cents. The printed
// "Create Your Own" kota is intentionally not orderable online because its
// R25+ price depends on choices that the source menu does not price.
export const FOOD_TRUCK_MENU: Meal[] = [
  // Build your plate — proteins
  { id: 'truck-plate-beef', name: 'Build Your Plate · Beef', description: 'Shisa nyama beef. Choose your sides and sauce separately from this Food Truck menu.', category: 'Food Truck', price: 7000, symbol: '🥩' },
  { id: 'truck-plate-drumsticks', name: 'Build Your Plate · Drumsticks', description: 'Chicken drumsticks. Choose your sides and sauce separately from this Food Truck menu.', category: 'Food Truck', price: 2000, symbol: '🍗' },
  { id: 'truck-plate-quarter-chicken', name: 'Build Your Plate · ¼ Chicken', description: 'Quarter chicken. Choose your sides and sauce separately from this Food Truck menu.', category: 'Food Truck', price: 4000, symbol: '🍗' },
  { id: 'truck-plate-wors', name: 'Build Your Plate · Wors', description: 'Grilled wors. Choose your sides and sauce separately from this Food Truck menu.', category: 'Food Truck', price: 2000, symbol: '🌭' },

  // Build your plate — sides and sauces
  { id: 'truck-side-pap-gravy', name: 'Side · Pap & Gravy', description: 'Food Truck side for your build-your-plate order.', category: 'Food Truck', price: 1500, symbol: '🥣' },
  { id: 'truck-side-grilled-veg', name: 'Side · Grilled Veg', description: 'Food Truck side for your build-your-plate order.', category: 'Food Truck', price: 2500, symbol: '🥦' },
  { id: 'truck-side-green-salad', name: 'Side · Green Salad', description: 'Food Truck side for your build-your-plate order.', category: 'Food Truck', price: 3000, symbol: '🥗' },
  { id: 'truck-side-small-chips', name: 'Side · Small Chips', description: 'Small portion of chips.', category: 'Food Truck', price: 1500, symbol: '🍟' },
  { id: 'truck-side-medium-chips', name: 'Side · Medium Chips', description: 'Medium portion of chips.', category: 'Food Truck', price: 2000, symbol: '🍟' },
  { id: 'truck-side-large-chips', name: 'Side · Large Chips', description: 'Large portion of chips.', category: 'Food Truck', price: 4500, symbol: '🍟' },
  { id: 'truck-sauce-chakalaka', name: 'Sauce · Chakalaka', description: 'Chakalaka for your Food Truck meal.', category: 'Food Truck', price: 1500, symbol: '🥫' },
  { id: 'truck-sauce-tomato-onion', name: 'Sauce · Tomato & Onion Relish', description: 'Tomato and onion relish for your Food Truck meal.', category: 'Food Truck', price: 1500, symbol: '🍅' },

  // Kotas — all include chips, cheese and egg
  { id: 'truck-kota-vienna', name: 'Kota · Vienna', description: 'Vienna with chakalaka, chips, cheese and egg. Select the achar option below if preferred.', category: 'Food Truck', price: 3000, symbol: '🥪', modifiers: [{ id: 'achar-instead-of-chakalaka', name: 'Achar instead of chakalaka', price: 0 }] },
  { id: 'truck-kota-russian', name: 'Kota · Russian', description: 'Russian with chakalaka, chips, cheese and egg. Select the achar option below if preferred.', category: 'Food Truck', price: 4000, symbol: '🥪', modifiers: [{ id: 'achar-instead-of-chakalaka', name: 'Achar instead of chakalaka', price: 0 }] },
  { id: 'truck-kota-vienna-russian', name: 'Kota · Vienna & Russian', description: 'Vienna and Russian with chakalaka, chips, cheese and egg. Select the achar option below if preferred.', category: 'Food Truck', price: 5000, symbol: '🥪', modifiers: [{ id: 'achar-instead-of-chakalaka', name: 'Achar instead of chakalaka', price: 0 }] },
  { id: 'truck-kota-steak', name: 'Kota · Steak', description: 'Steak with tomato relish, plus chips, cheese and egg.', category: 'Food Truck', price: 7000, symbol: '🥪' },
  { id: 'truck-kota-create-your-own', name: 'Kota · Create Your Own', description: 'Starts at R25. Kept unavailable online until the selectable fillings and their prices are confirmed.', category: 'Food Truck', price: 2500, symbol: '🥪', available: false },

  // Chow for one
  { id: 'truck-chow-russian-chips', name: 'Chow for 1 · Russian & Chips', description: 'Russian sausage served with chips.', category: 'Food Truck', price: 5500, symbol: '🍟' },
  { id: 'truck-chow-wings-chips', name: 'Chow for 1 · Wings & Chips', description: 'Chicken wings served with chips.', category: 'Food Truck', price: 5200, symbol: '🍗' },
  { id: 'truck-chow-vienna-chips', name: 'Chow for 1 · Vienna & Chips', description: 'Vienna served with chips.', category: 'Food Truck', price: 4000, symbol: '🌭' },
  { id: 'truck-chow-half-loaf-chips', name: 'Chow for 1 · Half Loaf & Chips', description: 'Half loaf served with chips.', category: 'Food Truck', price: 3000, symbol: '🍞' },
  { id: 'truck-chow-dagwood-chips', name: 'Chow for 1 · Dagwood & Chips', description: 'Dagwood sandwich served with chips.', category: 'Food Truck', price: 6000, symbol: '🥪' },
  { id: 'truck-chow-cheeseburger-chips', name: 'Chow for 1 · Cheeseburger & Chips', description: 'Cheeseburger served with chips.', category: 'Food Truck', price: 7500, symbol: '🍔' },
  { id: 'truck-chow-club-sandwich', name: 'Chow for 1 · Club Sandwich', description: 'Food Truck club sandwich.', category: 'Food Truck', price: 7500, symbol: '🥪' },

  // Breakfast
  { id: 'truck-breakfast-brekkie-bun', name: 'Food Truck Brekkie Bun', description: 'Bun with bacon, tomato relish, egg and cheese, served with chips.', category: 'Food Truck', price: 5500, symbol: '🍳' },
  { id: 'truck-breakfast-chicken-mayo-toastie', name: 'Food Truck Chicken Mayo Toastie', description: 'Chicken mayonnaise toastie from the Food Truck.', category: 'Food Truck', price: 5500, symbol: '🥪' },
];
