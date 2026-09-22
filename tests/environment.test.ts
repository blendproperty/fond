import assert from 'node:assert/strict';
import test from 'node:test';
import { isTestHost, publicAppName, staffAppName } from '../src/lib/environment';

test('staging hostname receives unmistakable test PWA names', () => {
  assert.equal(isTestHost('fond-test.mid-point.co.za'), true);
  assert.equal(isTestHost('fond-test.mid-point.co.za:443'), true);
  assert.equal(publicAppName('fond-test.mid-point.co.za'), 'FOND Midpoint TEST');
  assert.equal(staffAppName('fond-test.mid-point.co.za'), 'FOND Staff TEST');
});

test('production and unrelated hosts never receive a test identity', () => {
  assert.equal(isTestHost('fond.mid-point.co.za'), false);
  assert.equal(isTestHost('fond-test.mid-point.co.za.evil.example'), false);
  assert.equal(publicAppName('fond.mid-point.co.za'), 'FOND Midpoint');
  assert.equal(staffAppName('fond.mid-point.co.za'), 'FOND Staff');
});
