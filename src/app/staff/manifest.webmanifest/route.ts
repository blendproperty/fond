import { isTestHost, staffAppName } from '@/lib/environment';

export function GET(request: Request) {
  const host = request.headers.get('host');
  const test = isTestHost(host);
  return Response.json({
    id: '/staff',
    name: staffAppName(host),
    short_name: test ? 'STAFF TEST' : 'FOND Staff',
    description: 'FOND facility order queue.',
    start_url: '/staff',
    scope: '/staff',
    display: 'standalone',
    background_color: test ? '#fff4cf' : '#f2f6f5',
    theme_color: test ? '#b26b00' : '#082121',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/manifest+json' } });
}
