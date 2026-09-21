import type { Meal } from './menu';

// Approved food menu supplied as FOND_A3_Food_Menu_Landscape.md on
// 2026-09-21. Prices are stored in cents. Dietary labels mirror the printed
// legend: V vegetarian, VG vegan, GF gluten-free and VG OPTION as an explicit
// zero-cost modifier rather than labelling the base dish vegan.
export const PUBLISHED_FOOD_MENU: Meal[] = [
  // ---- All-Day Breakfast ----
  { id: 'smashed-avo', name: 'Smashed Avo', description: 'Smashed avo on sourdough with carrot crisps, pickled red onion, Parmesan, smoked feta whip and tahini drizzle.', category: 'All-Day Breakfast', price: 12000, diet: ['vegetarian'], symbol: '🥑' },
  { id: 'brekkie-bun', name: 'Brekkie Bun', description: 'Toasted brioche bun with crispy bacon, a fried egg topped with chilli crisp, fresh tomato, lettuce and American mustard.', category: 'All-Day Breakfast', price: 9500, symbol: '🥪' },
  { id: 'croque-madame-crepe', name: 'Croque Madame Crêpe', description: 'Crêpe filled with bacon and creamy béchamel, topped with fried eggs and chilli crisp.', category: 'All-Day Breakfast', price: 12000, symbol: '🥞' },
  { id: 'everyday-breakfast', name: 'Everyday Breakfast', description: 'Two eggs your way with caramelised onion, balsamic heirloom tomatoes and sourdough toast, plus your choice of bacon, beef sausage or chicken breast.', category: 'All-Day Breakfast', price: 10000, symbol: '🍳' },
  { id: 'greens-benedict', name: 'Greens Benedict', description: 'Baby marrow, broccoli, cauliflower and spinach on sourdough, topped with a poached egg, green herb hollandaise, blistered heirloom tomatoes and pickled carrots.', category: 'All-Day Breakfast', price: 11000, diet: ['vegetarian'], symbol: '🥗' },
  { id: 'classic-eggs-benedict', name: 'Classic Eggs Benedict', description: 'Soft-poached eggs with hollandaise, pickled carrots, blistered tomatoes and sautéed spinach, served on a freshly toasted English muffin.', category: 'All-Day Breakfast', price: 11000, symbol: '🍳' },
  { id: 'honey-halloumi-bowl', name: 'Honey Halloumi Breakfast Bowl', description: 'Grilled halloumi, blistered heirloom tomatoes, hummus, summer salad, two poached eggs and pita crisps.', category: 'All-Day Breakfast', price: 10000, diet: ['vegetarian'], symbol: '🥣' },
  { id: 'protein-dream', name: 'Protein Dream', description: 'Grilled smoked chicken breast with scrambled egg whites, sautéed spinach, feta, blistered heirloom tomatoes, parsley and herb drizzle.', category: 'All-Day Breakfast', price: 8000, symbol: '🍗' },
  { id: 'breakfast-foldover', name: 'Breakfast Foldover', description: 'Pizza base with fried eggs, bacon, crispy potato rosti, cheddar and mozzarella mix, chilli crisp and balsamic drizzle.', category: 'All-Day Breakfast', price: 12000, symbol: '🍕' },

  // ---- Sandwiches & Toasties ----
  { id: 'chicken-torched-brie-bagel', name: 'Chicken & Torched Brie Bagel', description: 'Pulled chicken, torched Brie, basil pesto, basil leaves and balsamic tomatoes.', category: 'Sandwiches', price: 12000, symbol: '🥯' },
  { id: 'fond-club-sandwich', name: 'FOND Club Sandwich', description: 'Pulled chicken, crispy streaky bacon, lettuce, tomato and garlic aioli, served with triple-fried chips.', category: 'Sandwiches', price: 12000, symbol: '🥪' },
  { id: 'the-gatsby', name: 'The Gatsby', description: 'Pulled brisket, triple-fried chips, piri-piri sauce, lettuce, sliced tomato and cheese.', category: 'Sandwiches', price: 13000, symbol: '🥖' },
  { id: 'smashed-salmon-bagel', name: 'Smashed Salmon Bagel', description: 'Smoked salmon trout ribbons, dill cream cheese, red onion, capers, pickled cucumber and fresh rocket.', category: 'Sandwiches', price: 12000, symbol: '🥯' },
  { id: 'happy-herbivore-sandwich', name: 'Happy Herbivore Sandwich', description: 'Toasted brinjal, pickled beetroot, smoky hummus, fresh tomato and mixed leaves.', category: 'Sandwiches', price: 11000, diet: ['vegan'], symbol: '🥪' },
  { id: 'torched-caprese-toast', name: 'Torched Caprese Toast', description: 'Torched Caprese toast with balsamic tomatoes and basil pesto, served on tomato focaccia.', category: 'Sandwiches', price: 10000, diet: ['vegetarian'], symbol: '🍅' },
  { id: 'toastie-cheddar-tomato', name: 'Classic Toastie — Cheddar Cheese & Tomato', description: 'Cheddar cheese and tomato.', category: 'Sandwiches', price: 7500, diet: ['vegetarian'], symbol: '🧀' },
  { id: 'toastie-bacon-cheese-tomato', name: 'Classic Toastie — Bacon, Cheese & Tomato', description: 'Bacon, cheese and tomato.', category: 'Sandwiches', price: 9500, symbol: '🧀' },
  { id: 'toastie-smoked-chicken-mayo', name: 'Classic Toastie — Smoked Chicken Mayo', description: 'Smoked chicken mayonnaise.', category: 'Sandwiches', price: 8000, symbol: '🧀' },

  // ---- Burgers ----
  { id: 'spicy-chicken-burger', name: 'Spicy Chicken Burger', description: 'Grilled chicken, caramelised onions, cheddar, fresh tomato, lettuce and garlic mayonnaise. Served with your choice of side.', category: 'Burgers', price: 12500, symbol: '🍔' },
  { id: 'fond-smashburger', name: 'FOND Smashburger', description: 'Two beef patties, crispy onions, pickled cabbage, cheddar, fresh tomato, lettuce and chipotle mayonnaise. Served with your choice of side.', category: 'Burgers', price: 13000, symbol: '🍔' },
  { id: 'halloumi-brinjal-burger', name: 'Halloumi Brinjal Burger', description: 'Sliced halloumi, grilled brinjal, harissa relish and fresh rocket. Served with your choice of side.', category: 'Burgers', price: 11000, diet: ['vegetarian'], symbol: '🍔' },

  // ---- Buddha Bowls ----
  { id: 'golden-goddess-bowl', name: 'Golden Goddess Bowl', description: 'Roasted sweet potato, chickpeas, brown rice, pickled red cabbage, cucumber, avocado, tahini dressing and pickled carrots.', category: 'Buddha Bowls', price: 12000, diet: ['vegan', 'gluten-free'], symbol: '🥣' },
  { id: 'teriyaki-chicken-bowl', name: 'Teriyaki Chicken Bowl', description: 'Sticky teriyaki chicken, edamame, brown rice, shredded carrots, cucumber and sesame seeds.', category: 'Buddha Bowls', price: 13000, diet: ['gluten-free'], symbol: '🥣' },
  { id: 'smoky-lentil-bowl', name: 'Smoky Lentil Bowl', description: 'Spiced lentils, roasted cauliflower, brown rice, baby spinach, pickled onions and a lemon-herb yoghurt.', category: 'Buddha Bowls', price: 11500, diet: ['vegetarian'], symbol: '🥣' },

  // ---- The Grill ----
  { id: 'slow-braised-shortrib', name: 'Slow Braised Shortrib', description: 'Slow-braised beef short ribs served over a bed of mash with garlic green beans and pickled carrots.', category: 'The Grill', price: 17000, symbol: '🍖' },
  { id: 'rump-280', name: 'Rump Steak (280g)', description: '280g rump steak, grilled to your liking. Served with your choice of side.', category: 'The Grill', price: 18000, symbol: '🥩' },
  { id: 'rump-350', name: 'Rump Steak (350g)', description: '350g rump steak, grilled to your liking. Served with your choice of side.', category: 'The Grill', price: 20000, symbol: '🥩' },

  // ---- Pizzas & Foldovers ----
  { id: 'supreme-vegetarian-pizza', name: 'Supreme Vegetarian Pizza', description: 'Onion, mushrooms, peppers, olives and mozzarella.', category: 'Pizzas & Foldovers', price: 13000, diet: ['vegetarian'], symbol: '🍕' },
  { id: 'loaded-potato-bacon-pizza', name: 'Loaded Potato and Bacon Pizza', description: 'Seasoned golden potatoes, sour cream and crispy bacon.', category: 'Pizzas & Foldovers', price: 12000, symbol: '🍕' },
  { id: 'chicken-foldover', name: 'Chicken Foldover', description: 'Herbed cream cheese, pulled chicken, mozzarella, fresh avocado, mushrooms, toasted sunflower seeds, pickled carrots and balsamic drizzle.', category: 'Pizzas & Foldovers', price: 15000, symbol: '🥟' },
  { id: 'classic-margherita-pizza', name: 'Classic Margherita Pizza', description: 'Homemade Neapolitan sauce, mozzarella, roasted Romanita tomatoes, fresh basil and balsamic drizzle.', category: 'Pizzas & Foldovers', price: 12500, diet: ['vegetarian'], symbol: '🍕' },
  { id: 'korean-steak-foldover', name: 'Korean Steak Foldover', description: 'Savoury Korean-style steak, charred peppers, toasted sesame seeds, red onion, jalapeño, fresh spring onion and sweet chilli mayonnaise.', category: 'Pizzas & Foldovers', price: 15000, symbol: '🥟' },
  { id: 'balsamic-avocado-pizza', name: 'Balsamic Avocado Pizza', description: 'Avocado, rocket, feta, roasted peppers and balsamic drizzle.', category: 'Pizzas & Foldovers', price: 12000, diet: ['vegetarian'], symbol: '🍕' },
  { id: 'pepperoni-classic-pizza', name: 'Pepperoni Classic Pizza', description: 'Homemade Neapolitan sauce, mozzarella, pepperoni and fresh basil.', category: 'Pizzas & Foldovers', price: 9500, symbol: '🍕' },
  { id: 'ham-mushroom-pizza', name: 'Ham & Mushroom Pizza', description: 'Neapolitan sauce, mozzarella, honey-glazed ham and sautéed mushrooms.', category: 'Pizzas & Foldovers', price: 9000, symbol: '🍕' },
  { id: 'four-cheese-pizza', name: 'Four Cheese Pizza', description: 'Mozzarella, cheddar, feta and Parmesan with a honey drizzle.', category: 'Pizzas & Foldovers', price: 9500, diet: ['vegetarian'], symbol: '🍕' },
  { id: 'garlic-cheese-bread-pizza', name: 'Garlic Cheese Bread Pizza', description: 'Roasted garlic butter, mozzarella and fresh parsley.', category: 'Pizzas & Foldovers', price: 8500, diet: ['vegetarian'], symbol: '🍕' },
  { id: 'bbq-chicken-pizza', name: 'BBQ Chicken Pizza', description: 'BBQ base, pulled chicken, red onion and mozzarella.', category: 'Pizzas & Foldovers', price: 10000, symbol: '🍕' },

  // ---- Poke Bowls ----
  { id: 'classic-tuna-poke', name: 'Classic Tuna Poke', description: 'Sushi-grade tuna, sushi rice, edamame, cucumber, avocado, spring onion, sesame seeds and ponzu dressing.', category: 'Poke Bowls', price: 14500, diet: ['gluten-free'], symbol: '🍣' },
  { id: 'salmon-poke', name: 'Salmon Poke', description: 'Fresh salmon, sushi rice, mango, pickled ginger, cucumber, avocado and sriracha mayonnaise.', category: 'Poke Bowls', price: 15500, diet: ['gluten-free'], symbol: '🍣' },
  { id: 'tofu-poke', name: 'Tofu Poke', description: 'Marinated crispy tofu, sushi rice, edamame, pickled carrots, cucumber, nori and soy-sesame dressing.', category: 'Poke Bowls', price: 13000, diet: ['vegan', 'gluten-free'], symbol: '🥣' },

  // ---- Salads ----
  { id: 'roast-pumpkin-salad', name: 'Roast Pumpkin Salad', description: 'Roast pumpkin with whipped cashews, chilli crisp, crispy sage and pine nuts.', category: 'Salads', price: 6500, diet: ['vegan'], symbol: '🎃' },
  { id: 'classic-greek-salad', name: 'Classic Greek Salad', description: 'Classic Greek salad with lemon-herb dressing.', category: 'Salads', price: 6500, diet: ['vegetarian'], symbol: '🥗' },
  { id: 'green-caesar-salad', name: 'Green Caesar Salad', description: 'Grilled halloumi tossed in green goddess Caesar dressing and served on shredded romaine lettuce.', category: 'Salads', price: 9500, diet: ['vegetarian'], symbol: '🥗' },
  { id: 'soba-noodle-salad', name: 'Soba Noodle Salad', description: 'Soba noodles tossed in sticky tamari sauce with snow peas and sweet-and-sour chicken, topped with peanut crunch.', category: 'Salads', price: 9500, symbol: '🍜' },

  // ---- Plates ----
  { id: 'grilled-lamb-chops', name: 'Grilled Lamb Chops', description: 'Marinated lamb chops served with charred tomato-coriander salsa and tzatziki.', category: 'Plates', price: 16000, diet: ['gluten-free'], symbol: '🍖' },
  { id: 'cauliflower-steak', name: 'Cauliflower Steak', description: 'Caramelised cauliflower steak on beetroot and butter bean purée with crushed feta and pistachio crumble, finished with a herb-pesto drizzle.', category: 'Plates', price: 9500, diet: ['vegetarian'], symbol: '🥦' },
  { id: 'confit-garlic-mushroom-pasta', name: 'Confit Garlic and Mushroom Pasta', description: 'Fresh linguine with creamy mushroom sauce, pangrattato and herbed oil.', category: 'Plates', price: 12000, diet: ['vegetarian'], symbol: '🍝' },

  // ---- Wraps ----
  { id: 'spicy-chicken-caesar-wrap', name: 'Spicy Chicken Caesar Wrap', description: 'Grilled spicy chicken, cos lettuce, Parmesan, croutons and Caesar dressing in a flour tortilla.', category: 'Wraps', price: 10500, symbol: '🌯' },
  { id: 'falafel-hummus-wrap', name: 'Falafel & Hummus Wrap', description: 'Crispy falafel, hummus, cucumber, tomato, pickled red onion and tzatziki.', category: 'Wraps', price: 9500, diet: ['vegetarian'], symbol: '🌯' },
  { id: 'steak-chimichurri-wrap', name: 'Steak & Chimichurri Wrap', description: 'Grilled rump strips, chimichurri, roasted peppers, rocket and garlic aioli.', category: 'Wraps', price: 12000, symbol: '🌯' },
  { id: 'smoked-salmon-avo-wrap', name: 'Smoked Salmon & Avo Wrap', description: 'Smoked salmon trout, avocado, cream cheese, cucumber and capers.', category: 'Wraps', price: 11500, symbol: '🌯' },

  // ---- Sides & Sauces ----
  { id: 'sauce-wild-mushroom-bechamel', name: 'Sauce — Wild Mushroom Béchamel', description: 'Add to a grill or plate.', category: 'Sides, Sauces & Add-Ons', price: 3000, diet: ['vegetarian'], symbol: '🥣' },
  { id: 'sauce-green-peppercorn', name: 'Sauce — Green Peppercorn', description: 'Add to a grill or plate.', category: 'Sides, Sauces & Add-Ons', price: 3000, symbol: '🥣' },
  { id: 'sauce-cheese', name: 'Sauce — Cheese', description: 'Add to a grill or plate.', category: 'Sides, Sauces & Add-Ons', price: 3000, diet: ['vegetarian'], symbol: '🥣' },
  { id: 'side-triple-fried-chips', name: 'Side — Triple-Fried Chips', description: 'Add to a grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 3500, diet: ['vegan'], symbol: '🍟' },
  { id: 'side-seasonal-green-salad', name: 'Side — Seasonal Green Salad', description: 'Add to a grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 3500, diet: ['vegan', 'gluten-free'], symbol: '🥗' },
  { id: 'side-seasonal-roast-vegetables', name: 'Side — Seasonal Roast Vegetables', description: 'Add to a grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 3500, diet: ['vegan', 'gluten-free'], symbol: '🥕' },
  { id: 'side-creamed-spinach', name: 'Side — Creamed Spinach', description: 'Add to a grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 3500, diet: ['vegetarian', 'gluten-free'], symbol: '🥬' },
  { id: 'side-sauteed-spinach', name: 'Side — Sautéed Spinach', description: 'Add to a grill, plate or burger.', category: 'Sides, Sauces & Add-Ons', price: 3500, diet: ['vegan', 'gluten-free'], symbol: '🥬' },
  { id: 'bread-gluten-free', name: 'Bread Upgrade — Gluten-Free', description: 'Swap in on a sandwich or toastie.', category: 'Sides, Sauces & Add-Ons', price: 2000, diet: ['gluten-free'], symbol: '🍞' },
  { id: 'bagel-gluten-free', name: 'Bagel Upgrade — Gluten-Free', description: 'Swap in on a bagel.', category: 'Sides, Sauces & Add-Ons', price: 2000, diet: ['gluten-free'], symbol: '🥯' },
  { id: 'bread-thick-brioche', name: 'Bread Upgrade — Thick-Cut Brioche', description: 'Swap in on a sandwich or toastie.', category: 'Sides, Sauces & Add-Ons', price: 2000, symbol: '🍞' },
];

export const RETIRED_FOOD_MENU_IDS = [
  'breakfast-burrito', 'rump-250', 'chipotle-fondant-potato',
  'marry-me-chicken-pizza-bowl', 'muffuletta', 'baked-halloumi-salad',
  'tiramisu-french-toast', 'banana-coffee-bread', 'golden-fried-churros',
  'pulled-beef-brisket-bao-buns', 'butter-poached-langoustine-toast',
  'corn-riblets', 'little-gem-salad', 'bang-bang-chicken', 'charcuterie-board',
  'sliders', 'vetkoek-flight', 'sauce-miso-mushroom-bechamel',
  'sauce-brandy-beurre-blanc', 'sauce-bourbon-parmesan', 'sauce-three-cheese',
  'side-paptert',
] as const;
