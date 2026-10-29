import type {Meal} from '@/lib/menu';

/** Illustrations represent dish types, rather than product photographs. */
export function FondFoodArt({meal}:{meal:Meal}) {
 const name=meal.name.toLowerCase();
 const kind=/smoothie|milkshake|frappe/.test(name)||meal.category==='Smoothies'?'smoothie'
  :meal.id.startsWith('truck-drink-')||/juice|iced|cold brew|lemonade|soda|water|coke|sprite|fanta|tonic|beer|cider|wine|lager|ale\b/.test(name)||meal.category==='Cold Bar & Juice'?'cold drink'
  :['Coffee','Tea & Steamers','Cold Brew & Iced'].includes(meal.category)?'hot drink'
  :/pizza|foldover/.test(name)||meal.category==='Pizzas & Foldovers'?'pizza'
  :/pasta|penne|napoletana/.test(name)||meal.category==='Pasta'?'pasta'
  :/salad|bowl|poke/.test(name)||['Salads','Buddha Bowls','Poke Bowls'].includes(meal.category)?'salad bowl'
  :/wrap|quesadilla/.test(name)||meal.category==='Wraps'?'wrap'
  :/burger|bun|bagel/.test(name)||meal.category==='Burgers'?'burger'
  :/cr[eê]pe/.test(name)?'crepe'
  :/omelette/.test(name)?'omelette'
  :/avo|toast|sandwich/.test(name)||meal.category==='Sandwiches'?'toast'
  :/steak|rump|ribeye|rib.eye|short.?rib|sirloin/.test(name)||meal.category==='The Grill'?'steak'
  :/fries|chips/.test(name)?'fries'
  :/cake|brownie|dessert|waffle/.test(name)||meal.category==='Desserts'?'dessert'
  :/egg|breakfast|benedict/.test(name)||meal.category==='All-Day Breakfast'?'breakfast'
  :/sauce|mayo|mustard|peppercorn|chimichurri/.test(name)?'sauce':'plated food';
 const plate=<><ellipse cx="75" cy="91" rx="62" ry="27" fill="#d1bd97"/><ellipse cx="75" cy="85" rx="60" ry="27" fill="#fffaf0"/><ellipse cx="75" cy="85" rx="49" ry="20" fill="#eadcc4"/></>;
 const greens=<><ellipse cx="45" cy="68" rx="18" ry="10" fill="#598346" transform="rotate(-25 45 68)"/><ellipse cx="78" cy="62" rx="24" ry="13" fill="#86a64c"/><ellipse cx="105" cy="72" rx="18" ry="11" fill="#47764a"/><circle cx="54" cy="77" r="8" fill="#c85d3d"/><circle cx="96" cy="62" r="7" fill="#d97842"/></>;
 const egg=<><path d="M48 67q4-19 22-13 18-11 27 5 19 12 3 26-19 10-39 3-24 0-13-21" fill="#fffdf4"/><circle cx="75" cy="70" r="12" fill="#edb43d"/></>;
 return <svg viewBox="0 0 150 130" role="img" aria-label={`${meal.name} illustration`} data-food-art={kind}>
  {kind==='burger'?<><ellipse cx="75" cy="106" rx="57" ry="8" fill="#d1bd97"/><path d="M20 52q55-70 110 0Z" fill="#c68c40"/><path d="M27 49q48-47 96 0" fill="#e7b765"/><path d="M22 64q28-14 51 0t54 0" fill="none" stroke="#658344" strokeWidth="12"/><path d="M25 75h100" stroke="#a35335" strokeWidth="10"/><path d="M20 87h110q-7 24-55 24T20 87" fill="#d99f4f"/><path d="m59 35 4-3m15 1 4-3m12 9 4-2" stroke="#fff0c8" strokeWidth="3"/></>
  :kind==='pizza'?<>{plate}<ellipse cx="75" cy="70" rx="53" ry="32" fill="#bd7b36"/><ellipse cx="75" cy="68" rx="46" ry="26" fill="#d4693d"/><ellipse cx="75" cy="67" rx="41" ry="22" fill="#edc565"/>{[45,72,100].map((x,i)=><circle key={x} cx={x} cy={62+i%2*14} r="7" fill="#b44e36"/>)}<path d="m57 50 8 7m20 24 8-6m-43 1 8 3m40-24 7 6" stroke="#527c43" strokeWidth="5"/></>
  :kind==='pasta'?<>{plate}<path d="M35 80q15-38 40-23t38 20q-30 22-78 3" fill="#c45a36"/>{[0,1,2,3,4,5].map(i=><path key={i} d={`m${40+i*11} ${72+i%2*8} 13-14`} stroke="#eac16a" strokeWidth="9" strokeLinecap="round"/>)}<path d="M73 55q-14-15-22-3 5 14 22 3m0 0q13-18 21-8-2 14-21 8" fill="#527f42"/></>
  :kind==='salad bowl'?<>{greens}<path d="M19 73h112q-5 39-56 39T19 73" fill="#b36b42"/><ellipse cx="75" cy="74" rx="55" ry="15" fill="#76974c"/>{greens}<path d="m66 76 12 5 10-10m-45-5 5-9m46 25 9-2" fill="none" stroke="#f1d88e" strokeWidth="5"/></>
  :kind==='wrap'?<>{plate}{greens}<path d="m34 49 78 18-27 39-44-12Z" fill="#d5a85f"/><path d="m34 49 46 32 32-14-27 39-44-12Z" fill="#edd09b"/><path d="m49 77 22 6m-18 6 13 4" stroke="#b68a51" strokeWidth="3"/></>
  :kind==='toast'?<>{plate}<path d="m30 54 71-14 19 49-73 14Z" fill="#ac713d"/><path d="m37 58 59-12 17 38-62 12Z" fill="#e7bd75"/><path d="m46 62 50-10 10 27-49 10Z" fill="#81a24d"/><path d="m55 64 8 18m4-21 8 18m4-21 8 18m4-21 8 18" stroke="#b8c96f" strokeWidth="3"/><circle cx="65" cy="69" r="4" fill="#ba5841"/><circle cx="95" cy="77" r="4" fill="#ba5841"/></>
  :kind==='steak'?<>{plate}<path d="M33 69q-1-24 30-22l35 9q25 18-1 36l-40 7q-28-2-24-30" fill="#8c4936"/><path d="M39 67q1-16 24-14l32 9q15 12-3 24l-34 6q-20-2-19-25" fill="#b76c46"/><path d="m48 62 39 23m-25-30 37 23m-53-3 25 15" stroke="#633e2e" strokeWidth="4"/><path d="m105 53 11 34m-1-39 11 33" stroke="#ddb653" strokeWidth="7"/></>
  :kind==='fries'?<><ellipse cx="75" cy="109" rx="43" ry="7" fill="#d1bd97"/>{[0,1,2,3,4,5].map(i=><path key={i} d={`m${42+i*12} 87 ${i%2?4:-3}-${47+i%3*8}`} stroke="#e8b84d" strokeWidth="9"/>)}<path d="m34 69 82 0-10 39H45Z" fill="#a54d37"/><path d="M59 88h32" stroke="#f8e6c5" strokeWidth="4"/></>
  :kind==='crepe'?<>{plate}<path d="m29 83 78-43 14 53Z" fill="#b97c3b"/><path d="m34 80 73-36-13 42Z" fill="#e8c079"/><path d="m43 78 50-24-9 28Z" fill="#f3dba4"/><path d="m50 87 43 5" stroke="#fff2d6" strokeWidth="5"/></>
  :kind==='omelette'?<>{plate}<path d="M25 82q48-64 101 0-48 36-101 0" fill="#c98a31"/><path d="M26 78q48-58 99 0Z" fill="#edbd4f"/><path d="m46 73 9-7m18-4 9 5m16 1 8 5" stroke="#648344" strokeWidth="4"/></>
  :kind==='hot drink'?<><ellipse cx="69" cy="109" rx="44" ry="8" fill="#d1bd97"/><path d="M100 49h8c23 0 21 39-8 38" fill="none" stroke="#a66a43" strokeWidth="10"/><path d="M30 42h72l-7 53q-29 19-58 0Z" fill="#ae6d46"/><ellipse cx="66" cy="43" rx="36" ry="11" fill="#653f2e"/><ellipse cx="66" cy="44" rx="26" ry="8" fill="#d8a96e"/><path d="M66 39q-20-5-14 5 10 10 23-1 4-9-9-4" fill="#fff2d8"/><path d="M53 26q-7-8 1-15m24 15q-7-8 1-15" fill="none" stroke="#b7916a" strokeWidth="3"/></>
  :kind==='cold drink'||kind==='smoothie'?<><ellipse cx="75" cy="112" rx="32" ry="6" fill="#d1bd97"/><path d="M46 33h58l-7 75H53Z" fill={kind==='smoothie'?'#b95d65':'#d19b45'}/><path d="M52 47h46l-5 55H57Z" fill={kind==='smoothie'?'#dc9394':'#edc567'}/><path d="m79 74 9-58h14" stroke="#63804b" strokeWidth="5" fill="none"/>{kind==='smoothie'?<><ellipse cx="75" cy="35" rx="29" ry="8" fill="#f0bdaf"/><circle cx="66" cy="34" r="5" fill="#b75c63"/></>:<><path d="m60 56 12 3-3 12-12-3m21 10 12 3-3 12-12-3" fill="#fff3cc"/><circle cx="101" cy="42" r="14" fill="#e7ba4e"/><circle cx="101" cy="42" r="10" fill="#f6df91"/></>}</>
  :kind==='dessert'?<>{plate}<path d="m39 56 71 17v24H39Z" fill="#764832"/><path d="m39 56 45-25 26 42Z" fill="#b97855"/><path d="m39 67 71 17" stroke="#ead0a0" strokeWidth="6"/><circle cx="81" cy="45" r="7" fill="#b84438"/></>
  :kind==='sauce'?<>{plate}<path d="M38 65h74q-2 34-37 34T38 65" fill="#aa7048"/><ellipse cx="75" cy="65" rx="37" ry="13" fill="#e4bc75"/><path d="M57 65q17-13 35 0-18 14-35 0" fill="#678647"/></>
  :<>{plate}{kind==='breakfast'?<><path d="m32 63 19-9 12 33-20 7Z" fill="#c88b48"/><path d="m96 62 15 22m-7-26 15 22" stroke="#a65b3c" strokeWidth="6"/>{egg}</>:<>{greens}<path d="m41 81 22-28 34 16-20 30Z" fill="#d39d50"/><path d="m58 65 24 13m-31-5 24 13" stroke="#9e673b" strokeWidth="4"/></>}</>}
 </svg>;
}
