import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminRole } from '@/lib/admin-auth';
import { audit, normalizePhone } from '@/lib/management';
import { validRequestOrigin } from '@/lib/request-origin';
import { sendWhatChimpSessionTest, sendWhatChimpOrder, whatChimpAllowed, whatChimpDeliveryStatus } from '@/lib/whatchimp';

const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  if (adminRole((await cookies()).get(ADMIN_COOKIE)?.value) !== 'super-admin') return Response.json({ message: 'Super admin access required.' }, { status: 403, headers });
  if (!validRequestOrigin(request) || !whatChimpAllowed()) return Response.json({ message: 'WhatChimp tests require an approved Midpoint Hub environment.' }, { status: 403, headers });
  const body = await request.json().catch(() => null);
  try {
    if (body?.action === 'status' && typeof body.providerId === 'string') {
      const result = await whatChimpDeliveryStatus(body.providerId);
      return Response.json(result.ok ? result : { message: `Could not verify delivery (${result.reason}).` }, { status: result.ok ? 200 : 502, headers });
    }
    if (typeof body?.to !== 'string' || !['session', 'order_accepted', 'order_ready'].includes(body.template)) return Response.json({ message: 'Enter your test number and choose a message.' }, { status: 400, headers });
    const to = normalizePhone(body.to);
    const result = body.template === 'session' ? await sendWhatChimpSessionTest(to) : await sendWhatChimpOrder({ toE164: to, templateName: body.template, customerName: 'Brett', reference: 'FOND-WHATSAPP-TEST' }, true);
    audit('super-admin', 'whatchimp-test', `${body.template}:${result.sent ? 'accepted' : result.reason}`);
    if (!result.sent) return Response.json({ message: `WhatChimp did not confirm acceptance (${result.reason}). For a session test, message the business number first. For order tests, check template approval and configuration. Check the provider log before retrying an uncertain send.` }, { status: 502, headers });
    return Response.json({ ok: true, providerId: result.providerId, message: 'WhatChimp accepted the test. Check delivery below and confirm it on your phone.' }, { headers });
  } catch { return Response.json({ message: 'Check the recipient number or message ID.' }, { status: 400, headers }); }
}
