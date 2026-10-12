import { allowOrderStatusLookup, lookupWhatsAppOrderStatus, orderStatusAuthorized } from '@/lib/whatsapp-order-status';

const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  if (!orderStatusAuthorized(request.headers.get('authorization'))) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  if (!allowOrderStatusLookup('provider-global', 240)) return Response.json({ message: 'Order tracking is busy. Please wait a minute and send TRACK again.' }, { headers });
  // Bound the streamed body, even when Content-Length is absent or inaccurate.
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ message: 'Please send TRACK and enter your full FOND order number.' }, { headers });
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); return Response.json({ error: 'Request too large' }, { status: 413, headers }); }
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  let body: unknown;
  try {
    body = request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw);
  } catch { return Response.json({ message: 'Please send TRACK and enter your full FOND order number.' }, { headers }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ message: 'Please send TRACK and enter your full FOND order number.' }, { headers });
  return Response.json(lookupWhatsAppOrderStatus(body), { headers });
}
