import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.FOND_DB_PATH = ':memory:';
let resetDbForTests: () => void;
let signUp: typeof import('../src/lib/auth').signUp;
let logIn: typeof import('../src/lib/auth').logIn;
let resolveSession: typeof import('../src/lib/auth').resolveSession;
let endSession: typeof import('../src/lib/auth').endSession;
let AuthError: typeof import('../src/lib/auth').AuthError;

before(async () => {
  ({ resetDbForTests } = await import('../src/lib/db'));
  ({ signUp, logIn, resolveSession, endSession, AuthError } = await import('../src/lib/auth'));
});

beforeEach(() => resetDbForTests());

test('signs up, logs in and resolves a session for the right user', () => {
  const { token, user } = signUp('Person@Example.com', 'correct-horse');
  assert.equal(user.email, 'person@example.com');
  assert.deepEqual(resolveSession(token), user);
  const second = logIn('person@example.com', 'correct-horse');
  assert.equal(second.user.id, user.id);
});

test('rejects duplicate emails, short passwords and wrong credentials', () => {
  signUp('dup@example.com', 'correct-horse');
  assert.throws(() => signUp('dup@example.com', 'correct-horse'), AuthError);
  assert.throws(() => signUp('new@example.com', 'short'), AuthError);
  assert.throws(() => logIn('dup@example.com', 'wrong-password'), AuthError);
  assert.throws(() => logIn('nobody@example.com', 'correct-horse'), AuthError);
});

test('ending a session invalidates it', () => {
  const { token } = signUp('logout@example.com', 'correct-horse');
  endSession(token);
  assert.equal(resolveSession(token), null);
});

test('an unknown or missing token resolves to no session', () => {
  assert.equal(resolveSession(null), null);
  assert.equal(resolveSession('not-a-real-token'), null);
});
