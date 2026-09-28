import type {DatabaseSync} from 'node:sqlite';

// Call inside the order transaction. Never reset or recycle a staff number.
export function allocateStaffOrderNumber(db:DatabaseSync):string {
  const row=db.prepare('UPDATE staff_order_sequence SET next_number=next_number+1 WHERE id=1 AND next_number<=999999 RETURNING next_number-1 AS number').get() as {number:number}|undefined;
  if(!row)throw new Error('Staff order numbers are exhausted. Contact the administrator.');
  return String(row.number);
}

export function staffNumbersInYocoNote(note:unknown):string[] {
  if(typeof note!=='string')return [];
  return [...new Set(Array.from(note.matchAll(/\bFOND[\s-]+([1-9]\d{5})(?![\w-])/gi),match=>match[1]))];
}
