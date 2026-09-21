import { SEED_MENU, type Modifier } from './menu';

// Launch options transcribed from the existing FOND menu. Only the menu's
// published add-on/swap prices are used; removing an ingredient costs R0.
const itemOptions: Record<string, { name: string; price: number }[]> = {
  'smashed-avo': [{ name: 'Vegan swap: smoky hummus instead of cheese', price: 0 }, { name: 'No pickled red onion', price: 0 }, { name: 'No Parmesan', price: 0 }],
  'brekkie-bun': [{ name: 'Vegan swap: tofu scramble & grilled aubergine', price: 0 }, { name: 'No bacon', price: 0 }, { name: 'No mustard', price: 0 }],
  'honey-halloumi-bowl': [{ name: 'Swap eggs for tofu scramble', price: 0 }, { name: 'No halloumi', price: 0 }],
  'everyday-breakfast': [{ name: 'No caramelised onion', price: 0 }],
  'spicy-chicken-burger': [{ name: 'No caramelised onions', price: 0 }, { name: 'No cheddar', price: 0 }, { name: 'No tomato', price: 0 }, { name: 'No garlic mayonnaise', price: 0 }],
  'fond-smashburger': [{ name: 'No crispy onions', price: 0 }, { name: 'No pickled cabbage', price: 0 }, { name: 'No cheddar', price: 0 }, { name: 'No chipotle mayonnaise', price: 0 }],
  'halloumi-brinjal-burger': [{ name: 'No halloumi', price: 0 }, { name: 'No harissa relish', price: 0 }],
  'fond-club-sandwich': [{ name: 'No bacon', price: 0 }, { name: 'No tomato', price: 0 }, { name: 'No garlic aioli', price: 0 }],
  'the-gatsby': [{ name: 'No cheese', price: 0 }, { name: 'No piri-piri sauce', price: 0 }],
  'smashed-salmon-bagel': [{ name: 'No red onion', price: 0 }, { name: 'No capers', price: 0 }, { name: 'No cream cheese', price: 0 }],
  'happy-herbivore-sandwich': [{ name: 'No tomato', price: 0 }, { name: 'No pickled beetroot', price: 0 }],
  'toastie-cheddar-tomato': [{ name: 'No tomato', price: 0 }],
  'toastie-bacon-cheese-tomato': [{ name: 'No bacon', price: 0 }, { name: 'No tomato', price: 0 }],
  'breakfast-foldover': [{ name: 'No bacon', price: 0 }, { name: 'No chilli crisp', price: 0 }],
};

const option = (name: string, price: number): Modifier => ({
  id: `fond-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/,'')}`,
  name,
  price,
});

export const DEFAULT_MENU_MODIFIERS: Record<string, Modifier[]> = Object.fromEntries(
  SEED_MENU.map(meal => {
    const choices = [...(itemOptions[meal.id] ?? [])];
    if (meal.category === 'Smoothies') choices.push(
      { name: 'Add maca', price: 3000 },
      { name: 'Add collagen', price: 3000 },
      { name: 'Add protein powder', price: 3000 },
    );
    if (meal.category === 'Sandwiches') {
      choices.push({ name: meal.id.includes('bagel') ? 'Gluten-free bagel upgrade' : 'Gluten-free bread upgrade', price: 2000 });
      if (!meal.id.includes('bagel')) choices.push({ name: 'Thick-cut brioche bread upgrade', price: 2000 });
    }
    if (meal.category === 'Coffee' && !['v60-single','v60-double','chemex-single','chemex-double','tasting-flight'].includes(meal.id)) choices.push(
      { name: 'Add espresso shot', price: 1200 },
      { name: 'Decaf', price: 1000 },
      { name: 'Flavoured syrup (specify flavour in note)', price: 1500 },
    );
    if ((meal.category === 'Coffee' || meal.category === 'Tea & Steamers' || meal.id === 'iced-latte') && /milk/i.test(meal.description)) choices.push(
      { name: 'MilkLab substitute (specify milk in note)', price: 1200 },
    );
    if (meal.category === 'Cold Bar & Juice' && ['citrus-fire','ruby-glow','golden-green'].includes(meal.id)) choices.push(
      { name: 'Add fresh ginger', price: 3000 },
    );
    return [meal.id, choices.map(({name, price}) => option(name, price))];
  }).filter(([, modifiers]) => (modifiers as Modifier[]).length > 0),
) as Record<string, Modifier[]>;
