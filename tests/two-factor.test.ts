import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { resetDbForTests } from '../src/lib/db';
import { saveMember, loginMember, loginAllowed, recordLoginFailure, clearLoginFailures } from '../src/lib/team';
import { activateTwoFactor, beginTwoFactor, validOtp } from '../src/lib/two-factor';
import { checkAdminCode } from '../src/lib/admin-auth';

process.env.FOND_DB_PATH = ':memory:';
beforeEach(resetDbForTests);
function independentCode(base32: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, number = 0; const bytes: number[] = [];
  for (const char of base32) { number = number * 32 + alphabet.indexOf(char); bits += 5; if (bits >= 8) { bytes.push(Math.floor(number / (2 ** (bits - 8))) & 255); bits -= 8; number %= 2 ** bits; } }
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  return String((hash.readUInt32BE(hash[19] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
test('TOTP accepts the published six digit RFC time vector and rejects wrong codes', () => {
  assert.equal(validOtp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '287082', 59000), true);
  assert.equal(validOtp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '000000', 59000), false);
});
test('named super admin requires 2FA after enrollment, recovery is one use, and shared code stops working', () => {
  process.env.FOND_CREDENTIALS_KEY = 'c'.repeat(64);
  process.env.FOND_ADMIN_CODE = 'bootstrap-test-code';
  try {
    const memberId = saveMember({ name: 'Super', username: 'super.test', role: 'super-admin', active: true, password: 'long-password-1234' }, 'shared-admin');
    assert.ok(checkAdminCode('bootstrap-test-code'));
    assert.ok(loginMember('super.test', 'long-password-1234'));
    const enrollment = beginTwoFactor(memberId, 'super.test');
    assert.match(enrollment.uri, /^otpauth:\/\/totp\//);
    const recovery = activateTwoFactor(memberId, independentCode(enrollment.secret));
    assert.equal(recovery.length, 8);
    assert.equal(checkAdminCode('bootstrap-test-code'), null);
    assert.equal(loginMember('super.test', 'long-password-1234'), null);
    assert.equal(loginMember('super.test', 'long-password-1234', '000000'), null);
    assert.ok(loginMember('super.test', 'long-password-1234', independentCode(enrollment.secret)));
    assert.ok(loginMember('super.test', 'long-password-1234', recovery[0]));
    assert.equal(loginMember('super.test', 'long-password-1234', recovery[0]), null);
  } finally { delete process.env.FOND_CREDENTIALS_KEY; delete process.env.FOND_ADMIN_CODE; }
});
test('successful sign-ins do not consume the failed-login rate limit', () => {
  for (let index = 0; index < 25; index++) assert.equal(loginAllowed('admin-shared'), true);
  for (let index = 0; index < 15; index++) recordLoginFailure('admin-shared');
  assert.equal(loginAllowed('admin-shared'), false);
  clearLoginFailures('admin-shared');
  assert.equal(loginAllowed('admin-shared'), true);
});
