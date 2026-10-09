import { document } from './management';
import { providerSecret } from './provider-secrets';
import { publicBaseUrl } from './public-url';

export type WhatChimpConfig = {
  enabled: boolean; phoneNumberId: string; acceptedTemplateId: string; readyTemplateId: string;
  nameParameter: string; referenceParameter: string;
};
export const EMPTY_WHATCHIMP: WhatChimpConfig = { enabled: false, phoneNumberId: '', acceptedTemplateId: '', readyTemplateId: '', nameParameter: '', referenceParameter: '' };
export const whatChimpConfig = (): WhatChimpConfig => ({ ...EMPTY_WHATCHIMP, ...document('whatchimp-config', EMPTY_WHATCHIMP) });
export function whatChimpAllowed() { return ['https://fond-test.mid-point.co.za', 'https://midpointhub.com', 'https://fond.mid-point.co.za'].includes(publicBaseUrl()); }
export function whatChimpEnvironment() { return publicBaseUrl() === 'https://fond-test.mid-point.co.za' ? 'staging' : 'production'; }
export function validateWhatChimpConfig(input: unknown): WhatChimpConfig {
  const raw = input as Partial<WhatChimpConfig> | null;
  const value: WhatChimpConfig = { enabled: raw?.enabled === true, phoneNumberId: raw?.phoneNumberId?.trim() ?? '', acceptedTemplateId: raw?.acceptedTemplateId?.trim() ?? '', readyTemplateId: raw?.readyTemplateId?.trim() ?? '', nameParameter: raw?.nameParameter?.trim() ?? '', referenceParameter: raw?.referenceParameter?.trim() ?? '' };
  if (!whatChimpAllowed()) throw new Error('WhatChimp is restricted to the approved Midpoint Hub environments.');
  if (!/^\d{6,30}$/.test(value.phoneNumberId)) throw new Error('Enter the connected WhatChimp phone number ID.');
  for (const id of [value.acceptedTemplateId, value.readyTemplateId]) if (id && !/^\d{1,30}$/.test(id)) throw new Error('Enter valid WhatChimp template IDs.');
  for (const name of [value.nameParameter, value.referenceParameter]) if (name && !/^templateVariable-[A-Za-z0-9_-]{1,80}-\d{1,2}$/.test(name)) throw new Error('Use the exact variable parameter from WhatChimp API Developer.');
  if (value.nameParameter && value.nameParameter === value.referenceParameter) throw new Error('Name and order reference must use different parameters.');
  if (value.enabled && (!value.acceptedTemplateId || !value.readyTemplateId || !value.referenceParameter)) throw new Error('Configure both approved templates and their exact reference parameter before enabling order notifications.');
  return value;
}
export function whatChimpConfigured() {
  try { return !!validateWhatChimpConfig(whatChimpConfig()).phoneNumberId && !!providerSecret('whatchimp-api-token'); } catch { return false; }
}
export function whatChimpOrdersConfigured() { return whatChimpConfigured() && whatChimpConfig().enabled; }
export function whatChimpTemplatesConfigured() {
  try { validateWhatChimpConfig({ ...whatChimpConfig(), enabled: true }); return whatChimpConfigured(); } catch { return false; }
}
export type WhatChimpResult = { sent: boolean; reason?: string; providerId?: string };
async function requestWhatChimp(path: string, fields: Record<string, string>) {
  if (!whatChimpConfigured()) return { ok: false as const, reason: 'NOT_CONFIGURED' };
  try {
    const response = await fetch(`https://app.whatchimp.com/api/v1/whatsapp/${path}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ apiToken: providerSecret('whatchimp-api-token')!, ...fields }),
    });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) return { ok: false as const, reason: `WHATCHIMP_HTTP_${response.status}` };
    if (String(data?.status) !== '1') return { ok: false as const, reason: 'WHATCHIMP_REJECTED' };
    return { ok: true as const, data: data! };
  } catch { return { ok: false as const, reason: 'NETWORK_ERROR' }; }
}
function recipient(phone: string) {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter a valid international phone number.');
  return phone.slice(1);
}
function sendResult(result: Awaited<ReturnType<typeof requestWhatChimp>>): WhatChimpResult {
  if (!result.ok) return { sent: false, reason: result.reason };
  if (typeof result.data.wa_message_id !== 'string' || !result.data.wa_message_id) return { sent: false, reason: 'NETWORK_ERROR' };
  return { sent: true, providerId: result.data.wa_message_id };
}
export async function sendWhatChimpSessionTest(to: string): Promise<WhatChimpResult> {
  return sendResult(await requestWhatChimp('send', { phone_number_id: whatChimpConfig().phoneNumberId, phone_number: recipient(to), message: 'Midpoint Hub WhatsApp: your connection test was accepted by the app. Please reply TEST RECEIVED so you can check the conversation in the WhatChimp inbox.' }));
}
export async function sendWhatChimpOrder(notification: { toE164: string; templateName: 'order_accepted' | 'order_ready'; customerName: string; reference: string }, controlledTest = false): Promise<WhatChimpResult> {
  if (!(controlledTest ? whatChimpTemplatesConfigured() : whatChimpOrdersConfigured())) return { sent: false, reason: 'NOT_CONFIGURED' };
  const config = whatChimpConfig();
  return sendResult(await requestWhatChimp('send/template', {
    phone_number_id: config.phoneNumberId, phone_number: recipient(notification.toE164),
    template_id: notification.templateName === 'order_accepted' ? config.acceptedTemplateId : config.readyTemplateId,
    // WhatChimp's built-in Name tag uses its subscriber record; only custom
    // variables appear in the generated API request. Do not invent a name key.
    ...(config.nameParameter ? { [config.nameParameter]: notification.customerName } : {}), [config.referenceParameter]: notification.reference,
  }));
}
export async function whatChimpDeliveryStatus(providerId: string) {
  if (!/^wamid\.[A-Za-z0-9+/=_-]{1,500}$/.test(providerId)) throw new Error('Enter a valid WhatsApp message ID.');
  const result = await requestWhatChimp('get/message-status', { wa_message_id: providerId });
  if (!result.ok) return { ok: false, reason: result.reason };
  // Do not pass provider responses, contact details or credentials to the browser.
  const message = result.data.message;
  const record = Array.isArray(message) ? message[0] : message;
  const raw = record && typeof record === 'object' ? (record as Record<string, unknown>).message_status ?? (record as Record<string, unknown>).status : record;
  const status = typeof raw === 'string' && ['sent', 'delivered', 'read', 'failed', 'queued'].includes(raw) ? raw : 'unconfirmed';
  return { ok: true, status };
}
