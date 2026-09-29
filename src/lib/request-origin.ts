/** Traefik can pass an internal request URL while the browser uses FOND_PUBLIC_URL. */
export function validRequestOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const accepted = [new URL(request.url).origin];
  // The old hostname remains routed for existing tablets and provider callbacks
  // during the Hub migration. Accept only this fixed, controlled legacy origin.
  if (process.env.MIDPOINT_HUB_ENABLED === 'true') accepted.push('https://fond.mid-point.co.za');
  if (process.env.FOND_PUBLIC_URL) {
    try { accepted.push(new URL(process.env.FOND_PUBLIC_URL).origin); } catch { /* Invalid configuration must never allow a new origin. */ }
  }
  const host = process.env.FOND_HOST;
  if (host && /^[a-z0-9.-]+$/i.test(host) && host.includes('.') && !host.includes('..')) {
    accepted.push(`https://${host.toLowerCase()}`);
  }
  return accepted.includes(origin);
}
