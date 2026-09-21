import type {Category,Meal} from './menu';

// Initial service-time estimates informed by published fast-casual ticket-time
// ranges. They are starting values only; FOND should replace them with measured
// normal-service averages. Specific overrides reflect dishes with a materially
// slower/faster method than their category.
const CATEGORY_MINUTES:Record<Category,number>={
  'All-Day Breakfast':12,'The Grill':18,'Plates':15,'Burgers':11,'Sandwiches':8,
  'Buddha Bowls':9,'Poke Bowls':9,'Wraps':8,
  'Salads':7,'Desserts':8,'Pizzas & Foldovers':15,'Tapas':10,'Coffee':3,
  'Tea & Steamers':4,'Cold Brew & Iced':3,'Smoothies':5,'Cold Bar & Juice':4,
  'Sides, Sauces & Add-Ons':6,
};
const OVERRIDES:Record<string,number>={
  'slow-braised-shortrib':12,'rump-250':18,'rump-280':18,'rump-350':20,'grilled-lamb-chops':18,
  'classic-eggs-benedict':14,'greens-benedict':14,'breakfast-foldover':16,
  'confit-garlic-mushroom-pasta':14,'golden-fried-churros':10,'tiramisu-french-toast':12,
  'v60-single':6,'v60-double':8,'chemex-single':7,'chemex-double':9,'tasting-flight':10,
};
export function estimatedPrepMinutes(item:Pick<Meal,'id'|'category'>){return OVERRIDES[item.id]??CATEGORY_MINUTES[item.category]??10;}
export function weightedPrepMinutes(baseMinutes:number,weightPercent:number){return Math.ceil(baseMinutes*(1+weightPercent/100));}
