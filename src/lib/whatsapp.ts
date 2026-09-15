import { document } from './management';
import { providerSecret } from './provider-secrets';

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

export type TwilioConfig = { accountSid: string; sender: string; acceptedContentSid: string; readyContentSid: string };
export const EMPTY_TWILIO: TwilioConfig = { accountSid: '', sender: '', acceptedContentSid: '', readyContentSid: '' };
export const twilioConfig = () => document('twilio-config', EMPTY_TWILIO);
export function validateTwilioConfig(input: unknown): TwilioConfig {
  const value = input as TwilioConfig;
  if (!value || !/^AC[a-f0-9]{32}$/i.test(value.accountSid) || !/^\+[1-9]\d{7,14}$/.test(value.sender) || !/^HX[a-f0-9]{32}$/i.test(value.acceptedContentSid) || !/^HX[a-f0-9]{32}$/i.test(value.readyContentSid)) throw new Error('Enter the Twilio Account SID, registered WhatsApp sender and two approved Content SIDs.');
  return value;
}
export function twilioConfigured() {
  try { const value = validateTwilioConfig(twilioConfig()); return !!value && !!providerSecret('twilio-auth-token'); }
  catch { return false; }
}

function isConfigured(): boolean {
  return twilioConfigured() || !!process.env.FOND_WHATSAPP_TOKEN && !!process.env.FOND_WHATSAPP_PHONE_NUMBER_ID;
}

export async function sendWhatsAppNotification(notification: WhatsAppNotification): Promise<{ sent: boolean; reason?: string }> {
  if (!isConfigured()) {
    return { sent: false, reason: 'NOT_CONFIGURED' };
  }
  if (twilioConfigured()) {
    const config = twilioConfig(), token = providerSecret('twilio-auth-token')!;
    const body = new URLSearchParams({
      From: `whatsapp:${config.sender}`, To: `whatsapp:${notification.toE164}`,
      ContentSid: notification.templateName === 'order_accepted' ? config.acceptedContentSid : config.readyContentSid,
      ContentVariables: JSON.stringify({ '1': notification.customerName, '2': notification.reference }),
    });
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Basic ${Buffer.from(`${config.accountSid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      return response.ok ? { sent: true } : { sent: false, reason: `TWILIO_HTTP_${response.status}` };
    } catch { return { sent: false, reason: 'NETWORK_ERROR' }; }
  }
  const token = process.env.FOND_WHATSAPP_TOKEN!;
  const phoneNumberId = process.env.FOND_WHATSAPP_PHONE_NUMBER_ID!;
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
          name: notification.templateName,
          language: { code: 'en' },
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
