import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validRequestOrigin } from '../src/lib/request-origin';

test('accepts the configured public origin behind a reverse proxy but rejects unrelated sites', () => {
  const previous = process.env.FOND_PUBLIC_URL;
  process.env.FOND_PUBLIC_URL = 'https://fond.mid-point.co.za/';
  const request = (origin: string) => new Request('http://fond:3000/api/admin/two-factor', { headers: { origin } });
  try {
    assert.equal(validRequestOrigin(request('https://fond.mid-point.co.za')), true);
    assert.equal(validRequestOrigin(request('http://fond:3000')), true);
    assert.equal(validRequestOrigin(request('https://other.example')), false);
    assert.equal(validRequestOrigin(request('https://fond.mid-point.co.za.evil.example')), false);
  } finally { if (previous === undefined) delete process.env.FOND_PUBLIC_URL; else process.env.FOND_PUBLIC_URL = previous; }
});
