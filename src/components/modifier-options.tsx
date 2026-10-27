import {useId} from 'react';
import {money, type Modifier} from '@/lib/menu';

export function modifierChoicesComplete(modifiers: Modifier[] = [], selected: string[]) {
  return modifiers.every(mod => !mod.choiceGroup || modifiers.filter(option => option.choiceGroup === mod.choiceGroup && selected.includes(option.id)).length === 1);
}

export function toggleModifierChoice(modifiers: Modifier[] = [], selected: string[], id: string) {
  const group = modifiers.find(mod => mod.id === id)?.choiceGroup;
  return group ? [...selected.filter(value => !modifiers.some(mod => mod.id === value && mod.choiceGroup === group)), id]
    : selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id];
}

export function ModifierOptions({modifiers = [], selected, onChange, optionClass = 'modifier-check'}: {modifiers?: Modifier[]; selected: string[]; onChange: (id: string) => void; optionClass?: string}) {
  const name = useId();
  return <>{[...new Set(modifiers.map(mod => mod.choiceGroup))].map(group => <fieldset key={group ?? 'optional'} style={{border:0,padding:0,margin:'0 0 8px',minWidth:0}}>
    <legend>{group ? `${group} · choose one` : 'Other options · optional'}</legend>
    {modifiers.filter(mod => mod.choiceGroup === group).map(mod => <label className={optionClass} key={mod.id}><input type={group ? 'radio' : 'checkbox'} name={group ? `${name}-${group}` : undefined} required={!!group} checked={selected.includes(mod.id)} onChange={() => onChange(mod.id)}/>{mod.name}{mod.price !== 0 && <span> ({mod.price > 0 ? '+' : ''}{money(mod.price)})</span>}</label>)}
  </fieldset>)}</>;
}
