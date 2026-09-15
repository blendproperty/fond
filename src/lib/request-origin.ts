/** Traefik can pass an internal request URL while the browser uses FOND_PUBLIC_URL. */
export function validRequestOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const accepted = [new URL(request.url).origin];
  if (process.env.FOND_PUBLIC_URL) {
    try { accepted.push(new URL(process.env.FOND_PUBLIC_URL).origin); } catch { /* Invalid configuration must never allow a new origin. */ }
  }
  return accepted.includes(origin);
}
