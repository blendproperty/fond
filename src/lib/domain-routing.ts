const OLD_HOST = 'fond.mid-point.co.za';
const NEW_HOST = 'midpointhub.com';
/** Only navigations redirect. Provider POST callbacks keep their original endpoint. */
export function hubRedirect(url: URL, method: string, enabled: boolean): string | null {
  if (!enabled || !['GET', 'HEAD'].includes(method) || url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return null;
  if (url.hostname === OLD_HOST || url.hostname === `www.${NEW_HOST}`) {
    const target = new URL(url.pathname + url.search, `https://${NEW_HOST}`);
    if (url.hostname === OLD_HOST && target.pathname === '/') target.pathname = '/fond';
    return target.href;
  }
  if (url.pathname === '/' && (url.searchParams.has('payment') || url.searchParams.has('reference'))) {
    const target = new URL(url); target.pathname = '/fond'; return target.href;
  }
  return null;
}
