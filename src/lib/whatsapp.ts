import { document } from './management';
import { providerSecret } from './provider-secrets';
import { publicBaseUrl } from './public-url';

// Transactional WhatsApp notifications use Twilio ContentSid templates when
// the merchant has registered a WhatsApp sender and approved the templates.
//
// What this needs to actually send a message, none of which this session
// can create on Brett's behalf (real business/API credentials):
//   1. A Meta Business Account with WhatsApp Business Platform enabled and
//      a registered/verified sending phone number.
//   2. A permanent access token + phone_number_id from the Meta Cloud API
//      (developers.facebook.com/apps -> WhatsApp -> API Setup), or the same
//      via a BSP like Twilio's WhatsApp API if that's preferred instead.
//   3. Because these are business-initiated messages sent outside a customer
//      support session (the customer isn't messaging FOND first), Meta
//      requires pre-approved message templates for anything sent this way -
//      a free-form message will be rejected outside a 24h customer-service
//      window. Two templates to submit for approval: "order_accepted" and
//      "order_ready" (or similar names), each with the customer's name and
//      order reference as variables.
// Until FOND_WHATSAPP_TOKEN and FOND_WHATSAPP_PHONE_NUMBER_ID are set, this
// module deliberately no-ops (logs and returns) rather than throwing, so
// order status updates keep working end-to-end regardless of whether
// WhatsApp is configured yet - matching the same fail-soft precedent as the
// old Yoco gate, but non-fatal here since WhatsApp is a notification, not a
// payment or order-acceptance step.

export type WhatsAppNotification = {
  toE164: string; // customer's contact number, expected in international format
  templateName: 'order_accepted' | 'order_ready';
  customerName: string;
  reference: string;
};

export type TwilioConfig = { mode: 'production' | 'sandbox'; accountSid: string; sender: string; acceptedContentSid: string; readyContentSid: string };
export type MetaConfig = { phoneNumberId: string; wabaId: string; acceptedTemplate: string; readyTemplate: string; languageCode: string };
export const EMPTY_META: MetaConfig = { phoneNumberId: '', wabaId: '', acceptedTemplate: 'fond_order_accepted', readyTemplate: 'fond_order_ready', languageCode: 'en' };
export const metaConfig = (): MetaConfig => ({ ...EMPTY_META, ...document('meta-whatsapp-config', EMPTY_META) });
export function validateMetaConfig(input: unknown): MetaConfig {
  const raw=input as Partial<MetaConfig>;
  const value={phoneNumberId:raw?.phoneNumberId?.trim()??'',wabaId:raw?.wabaId?.trim()??'',acceptedTemplate:raw?.acceptedTemplate?.trim()??'',readyTemplate:raw?.readyTemplate?.trim()??'',languageCode:raw?.languageCode?.trim()||'en'};
  if(!/^\d{6,30}$/.test(value.phoneNumberId)||!/^\d{6,30}$/.test(value.wabaId)||!/^[a-z0-9_]{1,512}$/.test(value.acceptedTemplate)||!/^[a-z0-9_]{1,512}$/.test(value.readyTemplate)||!/^[a-z]{2}(?:_[A-Z]{2})?$/.test(value.languageCode))throw new Error('Enter valid Meta WhatsApp IDs, template names and language.');
  return value;
}
export function metaConfigured(){try{validateMetaConfig(metaConfig());return !!(providerSecret('meta-access-token')||process.env.FOND_WHATSAPP_TOKEN);}catch{return false;}}
export const TWILIO_SANDBOX_SENDER = '+14155238886';
export const EMPTY_TWILIO: TwilioConfig = { mode: 'production', accountSid: '', sender: '', acceptedContentSid: '', readyContentSid: '' };
export const twilioConfig = (): TwilioConfig => ({ ...EMPTY_TWILIO, ...document('twilio-config', EMPTY_TWILIO) });
export function twilioSandboxAllowed() {
  try { return new URL(publicBaseUrl() ?? '').hostname.toLowerCase() === 'fond-test.mid-point.co.za'; }
  catch { return false; }
}
export function validateTwilioConfig(input: unknown): TwilioConfig {
  const raw = input as Partial<TwilioConfig>;
  const value: TwilioConfig = { mode: raw?.mode === 'sandbox' ? 'sandbox' : 'production', accountSid: raw?.accountSid?.trim() ?? '', sender: raw?.sender?.trim() ?? '', acceptedContentSid: raw?.acceptedContentSid?.trim() ?? '', readyContentSid: raw?.readyContentSid?.trim() ?? '' };
  if (!/^AC[a-f0-9]{32}$/i.test(value.accountSid)) throw new Error('Enter a valid Twilio Account SID.');
  if (value.mode === 'sandbox') {
    if (!twilioSandboxAllowed()) throw new Error('Twilio Sandbox mode is restricted to fond-test.mid-point.co.za.');
    return { ...value, sender: TWILIO_SANDBOX_SENDER, acceptedContentSid: '', readyContentSid: '' };
  }
  if (!/^\+[1-9]\d{7,14}$/.test(value.sender) || !/^HX[a-f0-9]{32}$/i.test(value.acceptedContentSid) || !/^HX[a-f0-9]{32}$/i.test(value.readyContentSid)) throw new Error('Enter the registered WhatsApp sender and two approved Content SIDs.');
  return value;
}
export function twilioConfigured() {
  try { const value = validateTwilioConfig(twilioConfig()); return !!value && !!providerSecret('twilio-auth-token'); }
  catch { return false; }
}

export function whatsappConfigured(): boolean {
  return metaConfigured() || twilioConfigured() || !!process.env.FOND_WHATSAPP_TOKEN && !!process.env.FOND_WHATSAPP_PHONE_NUMBER_ID;
}

export async function sendWhatsAppNotification(notification: WhatsAppNotification): Promise<{ sent: boolean; reason?: string }> {
  if (!whatsappConfigured()) {
    return { sent: false, reason: 'NOT_CONFIGURED' };
  }
  if (!metaConfigured() && twilioConfigured()) {
    const config = twilioConfig(), token = providerSecret('twilio-auth-token')!;
    const body = new URLSearchParams({ From: `whatsapp:${config.sender}`, To: `whatsapp:${notification.toE164}` });
    if (config.mode === 'sandbox') {
      const state = notification.templateName === 'order_accepted' ? 'has been accepted and is being prepared' : 'is ready';
      body.set('Body', `Hi ${notification.customerName}, your FOND order ${notification.reference} ${state}.`);
    } else {
      body.set('ContentSid', notification.templateName === 'order_accepted' ? config.acceptedContentSid : config.readyContentSid);
      body.set('ContentVariables', JSON.stringify({ '1': notification.customerName, '2': notification.reference }));
    }
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Basic ${Buffer.from(`${config.accountSid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      return response.ok ? { sent: true } : { sent: false, reason: `TWILIO_HTTP_${response.status}` };
    } catch { return { sent: false, reason: 'NETWORK_ERROR' }; }
  }
  const config=metaConfig();
  const token = providerSecret('meta-access-token')??process.env.FOND_WHATSAPP_TOKEN!;
  const phoneNumberId = config.phoneNumberId||process.env.FOND_WHATSAPP_PHONE_NUMBER_ID!;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: notification.toE164,
        type: 'template',
        template: {
          name: notification.templateName==='order_accepted'?config.acceptedTemplate:config.readyTemplate,
          language: { code: config.languageCode },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: notification.customerName }, { type: 'text', text: notification.reference }],
            },
          ],
        },
      }),
    });
    if (!res.ok) {
      return { sent: false, reason: `HTTP_${res.status}` };
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: 'NETWORK_ERROR' };
  }
}
