import { PUBLISHED_FOOD_MENU } from './published-food-menu';
import { FOOD_TRUCK_MENU } from './food-truck-menu';

// FOND Midpoint menu. The current food range is transcribed from
// FOND_A3_Food_Menu_Landscape.md (supplied 2026-09-21); the separate beverage
// range remains from the previously approved drinks menu. Prices are Rand,
// stored here in integer cents. This array is only
// the SEED data: the live, editable menu lives in the menu_items SQLite
// table (see src/lib/menu-store.ts) and is seeded from SEED_MENU below the
// first time the database is empty. Admins edit prices/availability/specials
// through /admin from then on - this file is not read again at runtime by
// the app itself, only by the one-time seed and by tests.
export type Category =
  | 'All-Day Breakfast'
  | 'The Grill'
  | 'Plates'
  | 'Burgers'
  | 'Sandwiches'
  | 'Buddha Bowls'
  | 'Poke Bowls'
  | 'Wraps'
  | 'Salads'
  | 'Desserts'
  | 'Pizzas & Foldovers'
  | 'Tapas'
  | 'Coffee'
  | 'Tea & Steamers'
  | 'Cold Brew & Iced'
  | 'Smoothies'
  | 'Cold Bar & Juice'
  | 'Sides, Sauces & Add-Ons'
  | 'Food Truck';

export type Diet = 'vegan' | 'vegetarian' | 'gluten-free';
export type Modifier = { id: string; name: string; price: number }; // price in cents, added when selected
export type Meal = {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: number; // cents — the effective/current price (special price when one is active)
  diet?: Diet[];
  symbol: string;
  available?: boolean;
  isSpecial?: boolean;
  specialLabel?: string | null;
  basePrice?: number; // present when isSpecial and different from price
  modifiers?: Modifier[]; // e.g. "no onion", "extra cheese (+15)" — optional add/remove options
  prepMinutes?: number; // editable estimated kitchen preparation time before buffer
};

const LEGACY_MENU: Meal[] = [
  // ---- All-Day Breakfast ----
  { id: 'smashed-avo', name: 'Smashed Avo', description: 'Smashed avo on sourdough with carrot crisps, pickled red onion, Parmesan, smoked feta whip and salsa verde. Vegan option: swap cheeses for smoky hummus (+0).', category: 'All-Day Breakfast', price: 12000, diet: ['vegetarian'], symbol: '🥑' },
  { id: 'brekkie-bun', name: 'Brekkie Bun', description: 'Toasted brioche bun with crispy bacon, a fried egg topped with chilli crisp, fresh tomato, lettuce and American mayonnaise. Vegan option: tofu scramble and grilled aubergine (+12).', category: 'All-Day Breakfast', price: 9500, symbol: '🥪' },
  { id: 'breakfast-burrito', name: 'Breakfast Burrito', description: 'Two eggs your way, Southern-style potato hash, grilled onions, cheddar cheese and southwest salsa.', category: 'All-Day Breakfast', price: 12000, diet: ['vegetarian'], symbol: '🌯' },
  { id: 'croque-madame-crepe', name: 'Croque Madame Crêpe', description: 'Crêpe filled with bacon and creamy béchamel, topped with fried eggs and chilli crisp.', category: 'All-Day Breakfast', price: 12000, symbol: '🥞' },
  { id: 'everyday-breakfast', name: 'Everyday Breakfast', description: 'Two eggs your way with caramelised onion, balsamic heirloom tomatoes and sourdough toast, plus your choice of bacon, beef sausage or chicken breast.', category: 'All-Day Breakfast', price: 10000, symbol: '🍳' },
  { id: 'greens-benedict', name: 'Greens Benedict', description: 'Baby marrow, broccoli, cauliflower and spinach on sourdough, topped with a poached egg, green herb hollandaise, blistered heirloom tomatoes and pickled carrots.', category: 'All-Day Breakfast', price: 16000, diet: ['vegetarian'], symbol: '🥗' },
  { id: 'classic-eggs-benedict', name: 'Classic Eggs Benedict', description: 'Two poached eggs with hollandaise, pickled carrots and blistered tomatoes, served on a freshly toasted English muffin.', category: 'All-Day Breakfast', price: 11000, diet: ['vegetarian'], symbol: '🍳' },
  { id: 'honey-halloumi-bowl', name: 'Honey Halloumi Breakfast Bowl', description: 'Grilled halloumi, blistered heirloom tomatoes, hummus, summer salad, two poached eggs and pita crisps. Vegan option: swap eggs for tofu scramble (+12).', category: 'All-Day Breakfast', price: 10000, diet: ['vegetarian'], symbol: '🥣' },
  { id: 'protein-dream', name: 'Protein Dream', description: 'Grilled smoked chicken breast with scrambled egg whites, sautéed spinach, feta, blistered heirloom tomatoes, parsley and herb drizzle.', category: 'All-Day Breakfast', price: 10000, symbol: '🍗' },
  { id: 'breakfast-foldover', name: 'Breakfast Foldover', description: 'Pizza base with fried eggs, bacon, crispy potato rostii, cheddar and mozzarella mix, chilli crisp and balsamic drizzle. House specialty.', category: 'All-Day Breakfast', price: 18000, symbol: '🍕' },

  // ---- The Grill ----
  { id: 'slow-braised-shortrib', name: 'Slow Braised Shortrib', description: 'Slow braised beef shortribs served over a bed of mash with garlic green beans and pickled carrots. House specialty. Served with your choice of side.', category: 'The Grill', price: 18000, symbol: '🍖' },
  { id: 'rump-250', name: 'Rump Steak (250g)', description: '250g rump steak, grilled to your liking. Served with your choice of side and sauce.', category: 'The Grill', price: 18000, diet: ['gluten-free'], symbol: '🥩' },
  { id: 'rump-350', name: 'Rump Steak (350g)', description: '350g rump steak, grilled to your liking. Served with your choice of side and sauce.', category: 'The Grill', price: 20000, diet: ['gluten-free'], symbol: '🥩' },

  // ---- Plates ----
  { id: 'grilled-lamb-chops', name: 'Grilled Lamb Chops', description: 'Marinated lamb chops served with charred tomato ezme salsa and tzatziki.', category: 'Plates', price: 16000, diet: ['gluten-free'], symbol: '🍖' },
  { id: 'chipotle-fondant-potato', name: 'Chipotle-Dusted Fondant Potato', description: 'Chipotle-dusted potato fondant topped with slow-braised brisket.', category: 'Plates', price: 11000, diet: ['gluten-free'], symbol: '🥔' },
  { id: 'cauliflower-steak', name: 'Cauliflower Steak', description: 'Caramelised cauliflower steak on beetroot and butter bean purée with crumbled feta and pistachio crumble, finished with a herb-pesto drizzle.', category: 'Plates', price: 9500, diet: ['vegetarian', 'gluten-free'], symbol: '🥦' },
  { id: 'marry-me-chicken-pizza-bowl', name: 'Marry Me Chicken Pizza Bowl', description: 'Spicy tomato chicken served at the table in a pizza bowl.', category: 'Plates', price: 16000, symbol: '🍗' },
  { id: 'confit-garlic-mushroom-pasta', name: 'Confit Garlic and Mushroom Pasta', description: 'Fresh linguine with creamy mushroom sauce, pangrattato and herbed oil.', category: 'Plates', price: 12000, diet: ['vegetarian'], symbol: '🍝' },

  // ---- Burgers (served with your choice of side) ----
  { id: 'spicy-chicken-burger', name: 'Spicy Chicken Burger', description: 'Grilled chicken breast, caramelised onions, cheddar, fresh tomato, lettuce and garlic mayonnaise. Served with your choice of side.', category: 'Burgers', price: 12500, symbol: '🍔' },
  { id: 'fond-smashburger', name: 'FOND Smashburger', description: 'Two beef patties, crispy onions, pickled cabbage, cheddar, fresh tomato, lettuce and chermoula mayonnaise. Served with your choice of side.', category: 'Burgers', price: 13000, symbol: '🍔' },
  { id: 'halloumi-brinjal-burger', name: 'Halloumi Brinjal Burger', description: 'Minted halloumi, grilled brinjal, harissa relish and fresh rocket. Served with your choice of side.', category: 'Burgers', price: 11000, diet: ['vegetarian'], symbol: '🍔' },

  // ---- Sandwiches ----
  { id: 'fond-club-sandwich', name: 'FOND Club Sandwich', description: 'Pulled chicken, crispy streaky bacon, lettuce, tomato and garlic aioli.', category: 'Sandwiches', price: 12000, symbol: '🥪' },
  { id: 'the-gatsby', name: 'The Gatsby', description: 'Pulled brisket, golden-fried chips, piri-piri sauce, lettuce, sliced tomato and cheese.', category: 'Sandwiches', price: 13000, symbol: '🥖' },
  { id: 'muffuletta', name: 'Muffuletta', description: 'Homemade olive salad, salami, smoked ham, Emmental and mozzarella.', category: 'Sandwiches', price: 16000, symbol: '🥖' },
  { id: 'smashed-salmon-bagel', name: 'Smashed Salmon Bagel', description: 'Smoked salmon trout ribbons, dill cream cheese, red onion, capers, pickled cucumber and fresh rocket.', category: 'Sandwiches', price: 14000, symbol: '🥯' },
  { id: 'chicken-torched-brie-bagel', name: 'Chicken & Torched Brie Bagel', description: 'Pulled chicken, torched Brie, basil pesto, basil leaves and balsamic tomatoes.', category: 'Sandwiches', price: 14000, symbol: '🥯' },
  { id: 'happy-herbivore-sandwich', name: 'Happy Herbivore Sandwich', description: 'Roasted brinjal, pickled beetroot, smoky hummus, fresh tomato and mixed leaves.', category: 'Sandwiches', price: 11000, diet: ['vegan'], symbol: '🥪' },
  { id: 'torched-caprese-toast', name: 'Torched Caprese Toast', description: 'Torched Caprese toast with balsamic tomatoes and basil pesto, served on tomato focaccia.', category: 'Sandwiches', price: 12000, diet: ['vegetarian'], symbol: '🍅' },
  { id: 'toastie-cheddar-tomato', name: 'Classic Toastie — Cheddar & Tomato', description: 'Cheddar cheese and tomato.', category: 'Sandwiches', price: 7500, diet: ['vegetarian'], symbol: '🧀' },
  { id: 'toastie-bacon-cheese-tomato', name: 'Classic Toastie — Bacon, Cheese & Tomato', description: 'Bacon, cheese and tomato.', category: 'Sandwiches', price: 9500, symbol: '🧀' },
  { id: 'toastie-smoked-chicken-mayo', name: 'Classic Toastie — Smoked Chicken Mayo', description: 'Smoked chicken mayo.', category: 'Sandwiches', price: 8000, symbol: '🧀' },

  // ---- Salads ----
  { id: 'baked-halloumi-salad', name: 'Baked Halloumi Salad', description: 'Baked halloumi with lemon and thyme honey, rocket, charred grapes and walnut crunch.', category: 'Salads', price: 9500, diet: ['vegetarian', 'gluten-free'], symbol: '🥗' },
  { id: 'roast-pumpkin-salad', name: 'Roast Pumpkin Salad', description: 'Roast pumpkin with whipped cashew, chilli crisp, crispy sage and pine nuts.', category: 'Salads', price: 8500, diet: ['vegan', 'gluten-free'], symbol: '🎃' },
  { id: 'classic-greek-salad', name: 'Classic Greek Salad', description: 'Classic Greek salad with lemon-herb dressing.', category: 'Salads', price: 7500, diet: ['vegetarian', 'gluten-free'], symbol: '🥗' },
  { id: 'green-caesar-salad', name: 'Green Caesar Salad', description: 'Grilled chicken tossed in green goddess Caesar dressing and served on shredded romaine lettuce.', category: 'Salads', price: 10000, diet: ['gluten-free'], symbol: '🥗' },
  { id: 'soba-noodle-salad', name: 'Soba Noodle Salad', description: 'Soba noodles tossed in sticky tamari sauce with snow peas and sweet-and-sour chicken, topped with peanut crunch.', category: 'Salads', price: 9500, diet: ['gluten-free'], symbol: '🍜' },

  // ---- Desserts ----
  { id: 'tiramisu-french-toast', name: 'Tiramisu French Toast', description: 'Mascarpone-stuffed, coffee-soaked brioche with a dusting of cocoa powder.', category: 'Desserts', price: 10000, symbol: '🍮' },
  { id: 'banana-coffee-bread', name: 'Banana Coffee Bread', description: 'Banana bread with espresso butter, chocolate granola and brûléed banana.', category: 'Desserts', price: 10000, symbol: '🍌' },
  { id: 'golden-fried-churros', name: 'Golden Fried Churros', description: 'Fresh, crispy churros with salted caramel dip.', category: 'Desserts', price: 6000, symbol: '🥨' },

  // ---- Pizzas & Foldovers (tapas menu) ----
  { id: 'supreme-vegetarian-pizza', name: 'Supreme Vegetarian Pizza', description: 'Onion, mushrooms, peppers, olives and mozzarella. +30 for gluten-free base.', category: 'Pizzas & Foldovers', price: 13000, diet: ['vegetarian'], symbol: '🍕' },
  { id: 'loaded-potato-bacon-pizza', name: 'Loaded Potato and Bacon Pizza', description: 'Seasoned golden potatoes, sour cream and crispy bacon. +30 for gluten-free base.', category: 'Pizzas & Foldovers', price: 12000, symbol: '🍕' },
  { id: 'chicken-foldover', name: 'Chicken Foldover', description: 'Herbed cream cheese, pulled chicken, mozzarella, fresh avocado, mushrooms, toasted sunflower seeds, pickled carrots and balsamic drizzle.', category: 'Pizzas & Foldovers', price: 16500, symbol: '🥟' },
  { id: 'classic-margherita-pizza', name: 'Classic Margherita Pizza', description: 'Homemade Neapolitan sauce, mozzarella, roasted Romanita tomatoes, fresh basil and balsamic drizzle. +30 for gluten-free base.', category: 'Pizzas & Foldovers', price: 12500, diet: ['vegetarian'], symbol: '🍕' },
  { id: 'korean-steak-foldover', name: 'Korean Steak Foldover', description: 'Savoury Korean-style steak, charred peppers, toasted sesame seeds, red onion, jalapeño, fresh spring onion and sweet chilli mayonnaise.', category: 'Pizzas & Foldovers', price: 16000, symbol: '🥟' },
  { id: 'balsamic-avocado-pizza', name: 'Balsamic Avocado Pizza', description: 'Avocado, rocket, feta, roasted peppers and balsamic drizzle. +30 for gluten-free base.', category: 'Pizzas & Foldovers', price: 12000, diet: ['vegan'], symbol: '🍕' },

  // ---- Tapas ----
  { id: 'pulled-beef-brisket-bao-buns', name: 'Pulled Beef Brisket Bao Buns', description: 'Bao buns filled with soy-braised pulled beef brisket, pickled carrots, cabbage and spring onion aioli.', category: 'Tapas', price: 16000, symbol: '🥟' },
  { id: 'butter-poached-langoustine-toast', name: 'Butter-Poached Langoustine Toast', description: 'Toasted milk-bread sandwiches filled with langoustines poached in burnt butter and topped with crispy sage and hollandaise mousse.', category: 'Tapas', price: 16000, symbol: '🦐' },
  { id: 'corn-riblets', name: 'Corn Riblets', description: 'Little gem salad with herb vinaigrette and spiced yoghurt, topped with garlic pangrattato.', category: 'Tapas', price: 10000, diet: ['vegetarian', 'gluten-free'], symbol: '🌽' },
  { id: 'little-gem-salad', name: 'Little Gem Salad', description: 'Homemade Neapolitan sauce, mozzarella, roasted Romanita tomatoes, fresh basil and balsamic drizzle.', category: 'Tapas', price: 12500, diet: ['vegetarian'], symbol: '🥗' },
  { id: 'bang-bang-chicken', name: 'Bang Bang Chicken', description: 'Bang bang chicken salad served with pickled cabbage, spring onion and sesame furikake.', category: 'Tapas', price: 11000, diet: ['gluten-free'], symbol: '🍗' },
  { id: 'charcuterie-board', name: 'Charcuterie Board', description: 'Local charcuterie board with seasonal preserves.', category: 'Tapas', price: 14000, symbol: '🧀' },
  { id: 'sliders', name: 'Sliders (Choose Any Two)', description: 'Spicy chicken, FOND smash or halloumi and brinjal — choose any two.', category: 'Tapas', price: 11000, symbol: '🍔' },
  { id: 'vetkoek-flight', name: 'Vetkoek Flight', description: 'Brûléed milk-tart vetkoek, cheese-and-jam vetkoek and tiramisu vetkoek.', category: 'Tapas', price: 11000, symbol: '🍩' },

  // ---- Coffee (Brew Lab + Coffee Playground) ----
  { id: 'espresso-single', name: 'Espresso (Single)', description: 'Rich, aromatic, strong, short coffee.', category: 'Coffee', price: 3200, symbol: '☕' },
  { id: 'espresso-double', name: 'Espresso (Double)', description: 'Rich, aromatic, strong, short coffee.', category: 'Coffee', price: 3600, symbol: '☕' },
  { id: 'americano', name: 'Americano', description: 'Double espresso with hot water.', category: 'Coffee', price: 4400, symbol: '☕' },
  { id: 'mocchiato-single', name: 'Mocchiato (Single)', description: 'Espresso with milk foam.', category: 'Coffee', price: 4000, symbol: '☕' },
  { id: 'mocchiato-double', name: 'Mocchiato (Double)', description: 'Espresso with milk foam.', category: 'Coffee', price: 4400, symbol: '☕' },
  { id: 'cortado-single', name: 'Cortado (Single)', description: 'Espresso with steamed milk and light foam.', category: 'Coffee', price: 4000, symbol: '☕' },
  { id: 'cortado-double', name: 'Cortado (Double)', description: 'Espresso with steamed milk and light foam.', category: 'Coffee', price: 4400, symbol: '☕' },
  { id: 'picolla-single', name: 'Picolla (Single)', description: 'Single espresso with steamed milk and heavy foam.', category: 'Coffee', price: 4000, symbol: '☕' },
  { id: 'picolla-double', name: 'Picolla (Double)', description: 'Single espresso with steamed milk and heavy foam.', category: 'Coffee', price: 4400, symbol: '☕' },
  { id: 'cappuccino-single', name: 'Cappuccino (Single)', description: 'Espresso with steamed milk and foam.', category: 'Coffee', price: 4200, symbol: '☕' },
  { id: 'cappuccino-double', name: 'Cappuccino (Double)', description: 'Espresso with steamed milk and foam.', category: 'Coffee', price: 4600, symbol: '☕' },
  { id: 'latte', name: 'Latte', description: 'Double espresso in a tall cup with steamed milk.', category: 'Coffee', price: 4600, symbol: '☕' },
  { id: 'flat-white', name: 'Flat White', description: 'Double espresso with steamed milk and micro foam.', category: 'Coffee', price: 4600, symbol: '☕' },
  { id: 'v60-single', name: 'V60 (Serves 1)', description: 'Slow-brewed pour-over with a light, tea-like body and bright flavour.', category: 'Coffee', price: 6900, symbol: '☕' },
  { id: 'v60-double', name: 'V60 (Serves 2)', description: 'Slow-brewed pour-over with a light, tea-like body and bright flavour.', category: 'Coffee', price: 8900, symbol: '☕' },
  { id: 'chemex-single', name: 'Chemex (Serves 1)', description: 'Smooth filter coffee with a fuller body, bold flavour and soft brightness.', category: 'Coffee', price: 7900, symbol: '☕' },
  { id: 'chemex-double', name: 'Chemex (Serves 2)', description: 'Smooth filter coffee with a fuller body, bold flavour and soft brightness.', category: 'Coffee', price: 9900, symbol: '☕' },
  { id: 'tasting-flight', name: 'Tasting Flight', description: 'Choose your coffee and we’ll brew it three ways: espresso, milk-based, and filter.', category: 'Coffee', price: 12500, symbol: '☕' },
  { id: 'nutella-cappuccino', name: 'Nutella Cappuccino', description: 'Single espresso with steamed milk, Nutella, and a nut crumble rim.', category: 'Coffee', price: 7000, symbol: '☕' },
  { id: 'cafe-mocha', name: 'Café Mocha', description: 'Single espresso with steamed milk and vegan hot chocolate.', category: 'Coffee', price: 6000, symbol: '☕' },
  { id: 'creme-brulee-latte', name: 'Crème Brûlée Latte', description: 'Double vanilla-infused espresso with steamed milk and brûléed sugar.', category: 'Coffee', price: 7000, symbol: '☕' },
  { id: 'vietnamese-latte', name: 'Vietnamese Latte', description: 'Double espresso with coconut condensed milk and steamed milk.', category: 'Coffee', price: 7000, symbol: '☕' },
  { id: 'dirty-chai-latte', name: 'Dirty Chai Latte', description: 'Single espresso with vegan spiced chai and steamed milk.', category: 'Coffee', price: 6000, symbol: '☕' },
  { id: 'caribbean-mocha', name: 'Caribbean Mocha', description: 'Coconut condensed milk with hot chocolate, single espresso and steamed milk.', category: 'Coffee', price: 7000, symbol: '☕' },

  // ---- Tea & Steamers ----
  { id: 'rooibos-cappuccino-single', name: 'Rooibos Cappuccino (Single)', description: 'Rooibos with steamed milk and foam.', category: 'Tea & Steamers', price: 5000, symbol: '🍵' },
  { id: 'rooibos-cappuccino-double', name: 'Rooibos Cappuccino (Double)', description: 'Rooibos with steamed milk and foam.', category: 'Tea & Steamers', price: 5800, symbol: '🍵' },
  { id: 'hot-chocolate', name: 'Hot Chocolate', description: 'Vegan hot chocolate with steamed milk.', category: 'Tea & Steamers', price: 5000, diet: ['vegan'], symbol: '🍫' },
  { id: 'golden-steamer', name: 'Golden Steamer', description: 'Turmeric, vanilla syrup, coconut milk and cinnamon.', category: 'Tea & Steamers', price: 6500, diet: ['vegan'], symbol: '🍵' },
  { id: 'chai', name: 'Chai', description: 'Vegan spiced chai with steamed milk.', category: 'Tea & Steamers', price: 5500, diet: ['vegan'], symbol: '🍵' },
  { id: 'classic-matcha', name: 'Classic Matcha', description: 'Matcha, your choice of milk and vanilla cold foam.', category: 'Tea & Steamers', price: 7500, symbol: '🍵' },
  { id: 'strawberry-matcha', name: 'Strawberry Matcha', description: 'Natural strawberry-infused matcha, your choice of milk and dark caramel cold foam.', category: 'Tea & Steamers', price: 8000, symbol: '🍵' },
  { id: 'cinnamon-matcha', name: 'Cinnamon Matcha', description: 'Cinnamon-infused matcha, your choice of milk and vanilla cold foam.', category: 'Tea & Steamers', price: 8000, symbol: '🍵' },
  { id: 'fond-matcha-match', name: 'FOND Matcha Match', description: 'Matcha, coconut milk, berry compote and vanilla cold foam.', category: 'Tea & Steamers', price: 8500, symbol: '🍵' },
  { id: 'tea-rooibos', name: 'Loose Leaf Tea — Rooibos', description: 'Herbal.', category: 'Tea & Steamers', price: 3700, symbol: '🍃' },
  { id: 'tea-peach-jasmine', name: 'Loose Leaf Tea — Peach and Jasmine', description: 'Oolong.', category: 'Tea & Steamers', price: 4500, symbol: '🍃' },
  { id: 'tea-pina-colada', name: 'Loose Leaf Tea — Piña Colada', description: 'Fruit infusion blend.', category: 'Tea & Steamers', price: 4500, symbol: '🍃' },
  { id: 'tea-vanilla-caramel', name: 'Loose Leaf Tea — Vanilla Caramel', description: 'Black tea.', category: 'Tea & Steamers', price: 4500, symbol: '🍃' },
  { id: 'tea-gunpowder-mint', name: 'Loose Leaf Tea — Gunpowder and Mint', description: 'Green tea.', category: 'Tea & Steamers', price: 4500, symbol: '🍃' },
  { id: 'tea-earl-grey', name: 'Loose Leaf Tea — Earl Grey', description: 'Black tea.', category: 'Tea & Steamers', price: 4500, symbol: '🍃' },
  { id: 'tea-english-breakfast', name: 'Loose Leaf Tea — English Breakfast', description: 'Black tea blend.', category: 'Tea & Steamers', price: 4500, symbol: '🍃' },
  { id: 'tea-5-roses', name: 'Loose Leaf Tea — 5 Roses', description: 'Ceylon-style black tea.', category: 'Tea & Steamers', price: 3700, symbol: '🍃' },

  // ---- Cold Brew & Iced ----
  { id: 'long-black', name: 'Long Black', description: 'Cold brew coffee over ice.', category: 'Cold Brew & Iced', price: 6000, symbol: '🧊' },
  { id: 'float', name: 'Float', description: 'Cold brew coffee over ice with vanilla cold foam.', category: 'Cold Brew & Iced', price: 7500, symbol: '🧊' },
  { id: 'mont-blanc', name: 'Mont Blanc', description: 'Cold brew coffee over ice with fresh orange juice, vanilla cold foam and orange zest.', category: 'Cold Brew & Iced', price: 8000, symbol: '🧊' },
  { id: 'drip-drizzle', name: 'Drip & Drizzle', description: 'Cold brew coffee over ice with caramel syrup and vanilla cold foam.', category: 'Cold Brew & Iced', price: 8000, symbol: '🧊' },
  { id: 'cold-brew-tonic', name: 'Cold Brew Tonic', description: 'Cold brew coffee charged with pink tonic.', category: 'Cold Brew & Iced', price: 7500, symbol: '🧊' },
  { id: 'iced-latte', name: 'Iced Latte', description: 'Double espresso, milk, and milk froth.', category: 'Cold Brew & Iced', price: 6500, symbol: '🧊' },
  { id: 'iced-vietnamese-latte', name: 'Iced Vietnamese Latte', description: 'Double espresso, coconut milk, condensed milk, milk and froth.', category: 'Cold Brew & Iced', price: 7000, symbol: '🧊' },
  { id: 'freezo', name: 'Freezo (Coffee, Chocolate or Mocha)', description: 'Vegan Freezo powder and milk, blended with ice — choice of coffee, chocolate or mocha.', category: 'Cold Brew & Iced', price: 7000, diet: ['vegan'], symbol: '🥤' },

  // ---- Smoothies ----
  { id: 'berry-oat-bliss', name: 'Berry Oat Bliss', description: 'Strawberries, banana, oats, double cream yoghurt and honey, blended with ice.', category: 'Smoothies', price: 7000, symbol: '🍓' },
  { id: 'tropical-gold', name: 'Tropical Gold', description: 'Mango, pineapple, banana and coconut milk, blended with ice.', category: 'Smoothies', price: 6000, diet: ['vegan', 'gluten-free'], symbol: '🥭' },
  { id: 'green-sunrise', name: 'Green Sunrise', description: 'Baby spinach, pear, banana and apple juice with fresh mint, blended with ice.', category: 'Smoothies', price: 6000, diet: ['vegan', 'gluten-free'], symbol: '🥬' },
  { id: 'peanut-power', name: 'Peanut Power', description: 'Banana, peanut butter, oats and milk with a touch of cinnamon, blended with ice.', category: 'Smoothies', price: 6000, symbol: '🥜' },
  { id: 'guava-cream', name: 'Guava Cream', description: 'Guava, pawpaw, double cream yoghurt and honey, blended with ice.', category: 'Smoothies', price: 8000, diet: ['gluten-free'], symbol: '🍈' },
  { id: 'cocoa-banana-boost', name: 'Cocoa Banana Boost', description: 'Banana, cocoa, dates and milk, blended with ice.', category: 'Smoothies', price: 6500, diet: ['gluten-free'], symbol: '🍌' },
  { id: 'citrus-dream', name: 'Citrus Dream', description: 'Orange, pineapple, banana and double cream yoghurt, blended with ice.', category: 'Smoothies', price: 6500, diet: ['gluten-free'], symbol: '🍊' },
  { id: 'strawberry-velvet', name: 'Strawberry Velvet', description: 'Strawberries, banana, double cream yoghurt and vanilla syrup, blended with ice.', category: 'Smoothies', price: 8000, diet: ['gluten-free'], symbol: '🍓' },
  { id: 'orchard-smoothie', name: 'Orchard Smoothie', description: 'Apple, pear, cinnamon, double cream yoghurt and honey, blended with ice.', category: 'Smoothies', price: 6500, diet: ['gluten-free'], symbol: '🍏' },

  // ---- Cold Bar & Juice ----
  { id: 'lemon-cordial', name: 'Homemade Lemon Cordial', description: 'With sparkling water.', category: 'Cold Bar & Juice', price: 3900, symbol: '🍋' },
  { id: 'lemon-iced-tea', name: 'Lemon Iced Tea', description: 'Lemon iced tea with sparkling water.', category: 'Cold Bar & Juice', price: 4800, symbol: '🍋' },
  { id: 'mango-lemonade', name: 'Mango Lemonade', description: 'Mango, lemonade and sparkling water.', category: 'Cold Bar & Juice', price: 4800, symbol: '🥭' },
  { id: 'peach-bellini', name: 'Peach Bellini (Non-Alcoholic)', description: 'Iced tea, peach purée, lime juice and sparkling water.', category: 'Cold Bar & Juice', price: 4800, symbol: '🍑' },
  { id: 'pink-grapefruit-lemonade', name: 'Pink Grapefruit Lemonade', description: 'Grapefruit, lemon cordial and sparkling water.', category: 'Cold Bar & Juice', price: 4800, symbol: '🍊' },
  { id: 'water', name: 'Water (Still or Sparkling)', description: 'Still or sparkling water.', category: 'Cold Bar & Juice', price: 3000, diet: ['vegan', 'gluten-free'], symbol: '💧' },
  { id: 'citrus-fire', name: 'Citrus Fire', description: 'Orange, pineapple, apple, ginger and lime.', category: 'Cold Bar & Juice', price: 7000, diet: ['vegan', 'gluten-free'], symbol: '🧃' },
  { id: 'ruby-glow', name: 'Ruby Glow', description: 'Beetroot, apple, carrot, orange and lemon.', category: 'Cold Bar & Juice', price: 7000, diet: ['vegan', 'gluten-free'], symbol: '🧃' },
  { id: 'golden-green', name: 'Golden Green', description: 'Pear, green apple, cucumber, baby spinach, mint and lime.', category: 'Cold Bar & Juice', price: 7500, diet: ['vegan', 'gluten-free'], symbol: '🧃' },
  { id: 'winter-orchard', name: 'Winter Orchard', description: 'Pear, apple, cinnamon, lemon and ginger.', category: 'Cold Bar & Juice', price: 6000, diet: ['vegan', 'gluten-free'], symbol: '🧃' },
  { id: 'granadilla-spark', name: 'Granadilla Spark', description: 'Granadilla, pineapple, orange and mint.', category: 'Cold Bar & Juice', price: 6000, diet: ['vegan', 'gluten-free'], symbol: '🧃' },

  // ---- Sides, Sauces & Add-Ons ----
  { id: 'sauce-miso-mushroom-bechamel', name: 'Sauce — Miso Mushroom Béchamel', description: 'Add to any grill or plate.', category: 'Sides, Sauces & Add-Ons', price: 4000, symbol: '🥣' },
  { id: 'sauce-green-peppercorn', name: 'Sauce — Green Peppercorn', description: 'Add to any grill or plate.', category: 'Sides, Sauces & Add-Ons', price: 4000, symbol: '🥣' },
  { id: 'sauce-brandy-beurre-blanc', name: 'Sauce — Brandy Beurre Blanc', description: 'Add to any grill or plate.', category: 'Sides, Sauces & Add-Ons', price: 6000, symbol: '🥣' },
  { id: 'sauce-bourbon-parmesan', name: 'Sauce — Bourbon Parmesan Cheese', description: 'Add to any grill or plate.', category: 'Sides, Sauces & Add-Ons', price: 6000, symbol: '🥣' },
  { id: 'sauce-three-cheese', name: 'Sauce — Three-Cheese', description: 'Add to any grill or plate.', category: 'Sides, Sauces & Add-Ons', price: 4000, symbol: '🥣' },
  { id: 'side-triple-fried-chips', name: 'Side — Triple Fried Chips', description: 'Add to any grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 3500, diet: ['vegan'], symbol: '🍟' },
  { id: 'side-seasonal-green-salad', name: 'Side — Seasonal Green Salad', description: 'Add to any grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 3500, diet: ['vegan', 'gluten-free'], symbol: '🥗' },
  { id: 'side-seasonal-roast-vegetables', name: 'Side — Seasonal Roast Vegetables', description: 'Add to any grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 4000, diet: ['vegan', 'gluten-free'], symbol: '🥕' },
  { id: 'side-creamed-spinach', name: 'Side — Creamed Spinach', description: 'Add to any grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 6000, diet: ['vegetarian', 'gluten-free'], symbol: '🥬' },
  { id: 'side-sauteed-spinach', name: 'Side — Sautéed Spinach', description: 'Add to any grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 5000, diet: ['vegan', 'gluten-free'], symbol: '🥬' },
  { id: 'side-paptert', name: 'Side — Paptert', description: 'Add to any grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 6000, diet: ['vegetarian'], symbol: '🍚' },
  { id: 'bread-gluten-free', name: 'Bread Upgrade — Gluten-Free', description: 'Swap in on any sandwich or toastie.', category: 'Sides, Sauces & Add-Ons', price: 3000, diet: ['gluten-free'], symbol: '🍞' },
  { id: 'bagel-gluten-free', name: 'Bagel Upgrade — Gluten-Free', description: 'Swap in on any bagel.', category: 'Sides, Sauces & Add-Ons', price: 4000, diet: ['gluten-free'], symbol: '🥯' },
  { id: 'bread-thick-brioche', name: 'Bread Upgrade — Thick Cut Brioche', description: 'Swap in on any sandwich or toastie.', category: 'Sides, Sauces & Add-Ons', price: 3000, symbol: '🍞' },
  { id: 'addon-milklab', name: 'Add-On — MilkLab Milk Substitute', description: 'Almond, oat or coconut, on any coffee or tea.', category: 'Sides, Sauces & Add-Ons', price: 1200, diet: ['vegan'], symbol: '🥛' },
  { id: 'addon-extra-shot', name: 'Add-On — Extra Espresso Shot', description: 'On any coffee.', category: 'Sides, Sauces & Add-Ons', price: 1200, symbol: '☕' },
  { id: 'addon-decaf', name: 'Add-On — Decaf', description: 'On any coffee.', category: 'Sides, Sauces & Add-Ons', price: 1000, symbol: '☕' },
  { id: 'addon-syrup', name: 'Add-On — Flavoured Syrup', description: 'Hazelnut, vanilla, almond or caramel, on any coffee.', category: 'Sides, Sauces & Add-Ons', price: 1500, symbol: '🍯' },
  { id: 'addon-ginger', name: 'Add-On — Fresh Ginger', description: 'On any freshly squeezed juice.', category: 'Sides, Sauces & Add-Ons', price: 3000, diet: ['vegan', 'gluten-free'], symbol: '🫚' },
  { id: 'addon-maca', name: 'Add-On — Maca', description: 'On any smoothie.', category: 'Sides, Sauces & Add-Ons', price: 3000, symbol: '🌱' },
  { id: 'addon-collagen', name: 'Add-On — Collagen', description: 'On any smoothie.', category: 'Sides, Sauces & Add-Ons', price: 3000, symbol: '🌱' },
  { id: 'addon-protein-powder', name: 'Add-On — Protein Powder', description: 'On any smoothie.', category: 'Sides, Sauces & Add-Ons', price: 3000, symbol: '🌱' },
];

const BEVERAGE_CATEGORIES = new Set<Category>([
  'Coffee',
  'Tea & Steamers',
  'Cold Brew & Iced',
  'Smoothies',
  'Cold Bar & Juice',
]);
const BEVERAGE_ADDON_IDS = new Set([
  'addon-milklab',
  'addon-extra-shot',
  'addon-decaf',
  'addon-syrup',
  'addon-ginger',
  'addon-maca',
  'addon-collagen',
  'addon-protein-powder',
]);

// The 2026-09-21 document replaces the food range only. Keep the separate
// beverage catalogue and its add-ons until an updated drinks menu is supplied.
export const SEED_MENU: Meal[] = [
  ...PUBLISHED_FOOD_MENU,
  ...LEGACY_MENU.filter((item) => BEVERAGE_CATEGORIES.has(item.category) || BEVERAGE_ADDON_IDS.has(item.id)),
  ...FOOD_TRUCK_MENU,
];

export { PUBLISHED_FOOD_MENU } from './published-food-menu';
export { FOOD_TRUCK_MENU, FOOD_TRUCK_SECTIONS, foodTruckSection, type FoodTruckSection } from './food-truck-menu';

export const categories: Category[] = [
  'All-Day Breakfast',
  'Sandwiches',
  'Burgers',
  'Buddha Bowls',
  'The Grill',
  'Pizzas & Foldovers',
  'Poke Bowls',
  'Salads',
  'Plates',
  'Wraps',
  'Coffee',
  'Tea & Steamers',
  'Cold Brew & Iced',
  'Smoothies',
  'Cold Bar & Juice',
  'Sides, Sauces & Add-Ons',
  'Food Truck',
];

export const money = (cents: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(cents / 100);

// modifierIds identifies a line uniquely alongside id, so the same base item
// can appear twice in a basket with different modifier selections (e.g. one
// "no onion" and one plain) - lineKey() below is what "seen" dedupes on.
export type CartLine = { id: string; quantity: number; modifierIds?: string[] };

export function lineKey(line: CartLine): string {
  return `${line.id}::${[...(line.modifierIds ?? [])].sort().join(',')}`;
}

// Pricing is always quoted against a caller-supplied menu, never trusted
// from the client (2026-09-14 admin/CRM addition: the live menu now lives
// in SQLite and prices can change at any time, so the server must always
// look prices up fresh rather than trusting anything in the request body).
// Defaults to SEED_MENU only for tests/tools that don't have a live DB.
export function quoteCart(lines: CartLine[], sourceMenu: Meal[] = SEED_MENU) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 40) throw new Error('Choose at least one item.');
  const seen = new Set<string>();
  return lines.map((line) => {
    const meal = sourceMenu.find((m) => m.id === line.id && m.available !== false);
    const key = lineKey(line);
    if (!meal || seen.has(key) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) {
      throw new Error('Your basket has an invalid item or quantity.');
    }
    const modifierIds = line.modifierIds ?? [];
    if (!Array.isArray(modifierIds) || new Set(modifierIds).size !== modifierIds.length || modifierIds.length>30) throw new Error('Invalid modifier selection.');
    const selectedModifiers = modifierIds.map((mid) => {
      const mod = meal.modifiers?.find((m) => m.id === mid);
      if (!mod) throw new Error('Your basket has an invalid modifier selection.');
      return mod;
    });
    seen.add(key);
    const unitPrice = meal.price + selectedModifiers.reduce((sum, m) => sum + m.price, 0);
    if (!Number.isSafeInteger(unitPrice) || unitPrice<0) throw new Error('Invalid item total.');
    return { ...meal, quantity: line.quantity, selectedModifiers, unitPrice, subtotal: unitPrice * line.quantity };
  });
}
