export type Category = 'Breakfast' | 'Lunch' | 'Smoothies';
export type Meal = { id: string; name: string; description: string; category: Category; price: number; tag: string; tone: string; symbol: string };
// Proposed FOND meals and illustrative prices. Not a live Yoco catalogue.
export const menu: Meal[] = [
 {id:'avo-eggs',name:'Avo & eggs on toast',description:'Sourdough, smashed avocado, soft eggs and a little chilli.',category:'Breakfast',price:6500,tag:'A good morning',tone:'sage',symbol:'🥑'},
 {id:'overnight-oats',name:'Overnight oat pot',description:'Creamy oats, yoghurt, seasonal fruit and toasted seeds.',category:'Breakfast',price:4500,tag:'Grab & go',tone:'rose',symbol:'🥣'},
 {id:'breakfast-wrap',name:'The breakfast wrap',description:'Scrambled eggs, cheddar, spinach and tomato relish.',category:'Breakfast',price:6000,tag:'Everyday favourite',tone:'sand',symbol:'🌯'},
 {id:'chicken-avo',name:'Chicken & avo wrap',description:'Grilled chicken, avocado, crisp greens and a yoghurt dressing.',category:'Lunch',price:7500,tag:'Lunch, sorted',tone:'sage',symbol:'🌯'},
 {id:'harvest-bowl',name:'The harvest bowl',description:'Roasted vegetables, grains, chickpeas and lemon tahini.',category:'Lunch',price:7000,tag:'Plant-powered',tone:'rose',symbol:'🥗'},
 {id:'chicken-rice',name:'Teriyaki chicken bowl',description:'Sticky chicken, brown rice, crunchy slaw and sesame.',category:'Lunch',price:8000,tag:'A proper lunch',tone:'sand',symbol:'🍚'},
 {id:'peanut',name:'Peanut protein',description:'Banana, peanut butter, milk, oats and whey protein.',category:'Smoothies',price:5500,tag:'Post-workout pick',tone:'sand',symbol:'🥜'},
 {id:'green',name:'The green one',description:'Pineapple, spinach, banana, lime and coconut water.',category:'Smoothies',price:5000,tag:'Fresh & bright',tone:'sage',symbol:'🥝'},
 {id:'berry',name:'Berry good',description:'Mixed berries, banana, yoghurt and milk.',category:'Smoothies',price:5000,tag:'A little lift',tone:'rose',symbol:'🫐'}
];
export const money = (cents: number) => new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:2}).format(cents/100);
export type CartLine = { id: string; quantity: number };
export function quoteCart(lines: CartLine[]) {
 if (!Array.isArray(lines) || !lines.length || lines.length > 30) throw new Error('Choose at least one meal.');
 const seen = new Set<string>();
 return lines.map(line => {
   const meal = menu.find(m => m.id === line.id);
   if (!meal || seen.has(line.id) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) throw new Error('Your basket has an invalid item or quantity.');
   seen.add(line.id);
   return { ...meal, quantity: line.quantity, subtotal: meal.price * line.quantity };
 });
}
