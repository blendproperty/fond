import {Leaf, Sprout, Tag, WheatOff} from 'lucide-react';
import type {Meal} from '@/lib/menu';

export function FondMenuBadges({meal}:{meal:Meal}) {
 if (!meal.isSpecial && !meal.diet?.length) return null;
 return <span className="fond-menu-badges">
  {meal.isSpecial && <span className="fond-menu-badge fond-menu-badge-special"><Tag aria-hidden="true"/>{meal.specialLabel || 'Special'}</span>}
  {meal.diet?.map(diet=>{const Icon=diet==='vegan'?Sprout:diet==='gluten-free'?WheatOff:Leaf;return <span className="fond-menu-badge" key={diet}><Icon aria-hidden="true"/>{diet==='gluten-free'?'Gluten-free':diet==='vegan'?'Vegan':'Vegetarian'}</span>})}
 </span>;
}
