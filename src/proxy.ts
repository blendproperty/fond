import { NextRequest, NextResponse } from 'next/server';
import { hubRedirect } from '@/lib/domain-routing';
export function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const host = request.headers.get('host')?.toLowerCase();
  // Traefik may leave Next's internal URL at localhost. Only reconstruct an
  // external URL for the fixed hostnames controlled by this deployment.
  if (host && ['fond.mid-point.co.za','midpointhub.com','www.midpointhub.com'].includes(host)) {
    url.host = host; url.protocol = 'https:';
  }
  const target = hubRedirect(url, request.method, process.env.MIDPOINT_HUB_ENABLED === 'true');
  return target ? NextResponse.redirect(target, 307) : NextResponse.next();
}
export const config = { matcher: ['/((?!api/|_next/|favicon.ico).*)'] };
