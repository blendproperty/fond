import { test, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.FOND_STAFF_CODE = 'test-code-123';
let checkStaffCode: typeof import('../src/lib/staff-auth').checkStaffCode;
let isValidStaffToken: typeof import('../src/lib/staff-auth').isValidStaffToken;

before(async () => {
  ({ checkStaffCode, isValidStaffToken } = await import('../src/lib/staff-auth'));
});

test('the correct code produces a token that validates', () => {
  const token = checkStaffCode('test-code-123');
  assert.ok(token);
  assert.equal(isValidStaffToken(token), true);
});

test('an incorrect code produces no token', () => {
  assert.equal(checkStaffCode('wrong-code'), null);
});

test('a missing, empty or forged token does not validate', () => {
  assert.equal(isValidStaffToken(undefined), false);
  assert.equal(isValidStaffToken(null), false);
  assert.equal(isValidStaffToken(''), false);
  assert.equal(isValidStaffToken('not-a-real-hmac'), false);
});
