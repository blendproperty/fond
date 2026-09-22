import test from 'node:test';
import assert from 'node:assert/strict';
import { staffModifierInstruction } from '../src/lib/staff-modifiers';

test('staff modifier instructions turn menu wording into direct kitchen actions', () => {
  assert.deepEqual(staffModifierInstruction('Vegan swap: smoky hummus instead of cheese'), {
    kind: 'swap', label: 'SWAP', detail: 'Smoky hummus instead of cheese',
  });
  assert.deepEqual(staffModifierInstruction('No pickled red onion'), {
    kind: 'remove', label: 'REMOVE', detail: 'Pickled red onion',
  });
  assert.deepEqual(staffModifierInstruction('Add protein powder'), {
    kind: 'add', label: 'ADD', detail: 'Protein powder',
  });
  assert.deepEqual(staffModifierInstruction('Cook well done'), {
    kind: 'change', label: 'CHANGE', detail: 'Cook well done',
  });
});
