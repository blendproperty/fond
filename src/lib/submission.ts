// Stores only a payload hash and random key, never customer details.
const keys = new Map<string, string>();
export async function submissionKey(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const name = `fond-submission:${hash}`;
  let key = keys.get(name);
  try { key ??= sessionStorage.getItem(name) ?? undefined; } catch { /* Private storage may be unavailable. */ }
  key ??= crypto.randomUUID();
  keys.set(name, key);
  try { sessionStorage.setItem(name, key); } catch { /* Same-page retries remain protected. */ }
  return key;
}
export function clearSubmission(key: string) {
  for (const [name, value] of keys) if (value === key) {
    keys.delete(name);
    try { sessionStorage.removeItem(name); } catch { /* Nothing to clear. */ }
  }
}
