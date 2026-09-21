import type { OrderRecord, OrderStatus } from './orders';

export type EmailMessage = { subject: string; text: string; html: string };

const BRAND = {
  ink: '#123c35',
  green: '#173f37',
  accent: '#a23828',
  aqua: '#18c8c0',
  mist: '#f1f5f3',
  paper: '#ffffff',
  slate: '#5d706c',
  line: '#dce6e3',
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character] ?? character));

const money = (cents: number) => `R ${(cents / 100).toFixed(2).replace('.', ',')}`;
const publicUrl = () => (process.env.FOND_PUBLIC_URL ?? 'https://fond.mid-point.co.za').replace(/\/$/, '');

function row(label: string, value: string) {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-size:12px;line-height:18px;color:${BRAND.slate};text-transform:uppercase;letter-spacing:1px;width:38%;vertical-align:top">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;line-height:20px;color:${BRAND.ink};font-weight:700;text-align:right;vertical-align:top">${escapeHtml(value)}</td></tr>`;
}

function layout(input: {
  preview: string;
  eyebrow: string;
  title: string;
  intro: string;
  content?: string;
  button?: { label: string; href: string };
  footer: string;
}) {
  const button = input.button ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 4px"><tr><td bgcolor="${BRAND.accent}" style="border-radius:8px"><a href="${escapeHtml(input.button.href)}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:14px;line-height:18px;font-weight:700">${escapeHtml(input.button.label)} &nbsp;→</a></td></tr></table>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.mist};color:${BRAND.ink};font-family:Arial,'Helvetica Neue',sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.preview)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.mist}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:${BRAND.paper};border:1px solid ${BRAND.line};border-radius:14px;overflow:hidden">
<tr><td bgcolor="${BRAND.green}" style="padding:26px 34px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:34px;font-weight:700;color:#ffffff;letter-spacing:-1px">fond<span style="color:${BRAND.aqua}">.</span></td><td align="right" style="font-size:10px;line-height:14px;font-weight:700;color:#d8e8e4;letter-spacing:2px;text-transform:uppercase">Midpoint Hub</td></tr></table></td></tr>
<tr><td style="padding:38px 34px 34px"><p style="margin:0 0 14px;color:${BRAND.accent};font-size:11px;line-height:16px;font-weight:800;letter-spacing:1.7px;text-transform:uppercase">${escapeHtml(input.eyebrow)}</p><h1 style="margin:0 0 16px;color:${BRAND.ink};font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:37px;font-weight:700">${escapeHtml(input.title)}</h1><p style="margin:0 0 22px;color:${BRAND.slate};font-size:15px;line-height:24px">${escapeHtml(input.intro)}</p>${input.content ?? ''}${button}</td></tr>
<tr><td style="padding:22px 34px;background:#f8faf9;border-top:1px solid ${BRAND.line}"><p style="margin:0 0 7px;color:${BRAND.ink};font-size:12px;line-height:18px;font-weight:700">FOND · Midpoint Hub</p><p style="margin:0;color:${BRAND.slate};font-size:11px;line-height:17px">${escapeHtml(input.footer)}</p></td></tr>
</table></td></tr></table></body></html>`;
}

export function buildControlledTestEmail(): EmailMessage {
  const subject = 'Your FOND email updates are ready';
  const text = `FOND Midpoint Hub\n\nYour email updates are ready.\n\nThis live test confirms that FOND can send transactional order updates from orders@fond.mid-point.co.za.\n\nNo action is needed.\n\nFOND · Midpoint Hub`;
  const content = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 0;background:#eef7f3;border:1px solid #cfe4dc;border-radius:10px"><tr><td style="padding:18px 20px"><p style="margin:0 0 6px;color:${BRAND.green};font-size:13px;line-height:19px;font-weight:800">✓ Transactional email is connected</p><p style="margin:0;color:${BRAND.slate};font-size:13px;line-height:20px">Order confirmations and status updates will use this same verified FOND channel.</p></td></tr></table>`;
  return { subject, text, html: layout({ preview: 'FOND transactional email is connected and ready.', eyebrow: 'Email setup confirmed', title: 'Your FOND updates are ready.', intro: 'This live test confirms that FOND can send clear, branded transactional order updates from its verified address.', content, button: { label: 'Visit FOND', href: 'https://fond.mid-point.co.za/' }, footer: 'You received this operational test because the FOND notification channel was verified for your address. No action is needed.' }) };
}

export function buildVerificationEmail(code: string): EmailMessage {
  const subject = 'Your FOND verification code';
  const text = `FOND Midpoint Hub\n\nVerify your email\n\nYour verification code is ${code}.\n\nIt expires in 10 minutes. If you did not request this code, you can ignore this email.\n\nFOND · Midpoint Hub`;
  const content = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 4px;background:${BRAND.green};border-radius:10px"><tr><td align="center" style="padding:22px"><p style="margin:0 0 8px;color:#cfe1dc;font-size:10px;line-height:14px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase">Your six digit code</p><p style="margin:0;color:#ffffff;font-family:'Courier New',monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:8px">${escapeHtml(code)}</p></td></tr></table>`;
  return { subject, text, html: layout({ preview: `Your FOND verification code is ${code}.`, eyebrow: 'Secure account verification', title: 'Verify your email.', intro: 'Enter the code below in your FOND account. It expires in 10 minutes.', content, button: { label: 'Open my FOND account', href: `${publicUrl()}/account` }, footer: 'If you did not request this code, you can safely ignore this email. FOND will never ask you to send this code to anyone.' }) };
}

const eventCopy: Record<'received' | 'accepted' | 'ready' | 'completed', { eyebrow: string; title: string; intro: (order: OrderRecord) => string }> = {
  received: { eyebrow: 'Order received', title: 'We have your order.', intro: order => `Thanks, ${order.customerName}. FOND has received ${order.reference} and the team will review it shortly.` },
  accepted: { eyebrow: 'Order confirmed', title: 'Your order is confirmed.', intro: order => `Good news, ${order.customerName}. The FOND team has accepted ${order.reference}.` },
  ready: { eyebrow: 'Order ready', title: 'Your order is ready.', intro: order => order.fulfillment === 'delivery' ? `${order.customerName}, your order is ready for delivery.` : `${order.customerName}, your order is ready to collect from FOND at Midpoint Hub.` },
  completed: { eyebrow: 'Order complete', title: 'Thank you for ordering.', intro: order => `${order.customerName}, order ${order.reference} has been completed. We hope you enjoy it.` },
};

const statusLabel = (status: OrderStatus) => ({ received: 'Received', accepted: 'Confirmed', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }[status]);

export function buildOrderEmail(order: OrderRecord, event: 'received' | 'accepted' | 'ready' | 'completed'): EmailMessage {
  const copy = eventCopy[event];
  const fulfilment = order.fulfillment === 'delivery' ? 'Delivery' : 'Collection';
  const payment = order.paymentMethod === 'yoco_online' ? 'Paid securely online' : 'Pay at FOND';
  const itemText = order.lines.map(line => `${line.quantity} × ${line.name}${line.modifiers?.length ? ` (${line.modifiers.map(modifier => modifier.name).join(', ')})` : ''}`).join('\n');
  const itemsHtml = order.lines.map(line => `<tr><td style="padding:8px 0;color:${BRAND.ink};font-size:13px;line-height:19px;vertical-align:top"><strong>${line.quantity} ×</strong> ${escapeHtml(line.name)}${line.modifiers?.length ? `<br><span style="color:${BRAND.slate};font-size:12px">${escapeHtml(line.modifiers.map(modifier => modifier.name).join(', '))}</span>` : ''}</td><td align="right" style="padding:8px 0;color:${BRAND.ink};font-size:13px;line-height:19px;font-weight:700;vertical-align:top">${escapeHtml(money(line.subtotalCents))}</td></tr>`).join('');
  const destination = order.fulfillment === 'delivery' ? [order.company, order.building].filter(Boolean).join(' · ') : 'FOND · Midpoint Hub';
  const subject = event === 'received' ? `FOND has received ${order.reference}` : event === 'ready' ? `Your FOND order ${order.reference} is ready` : event === 'accepted' ? `FOND confirmed ${order.reference}` : `Thank you for your FOND order ${order.reference}`;
  const text = `FOND Midpoint Hub\n\n${copy.title}\n\n${copy.intro(order)}\n\nOrder: ${order.reference}\nStatus: ${statusLabel(event)}\n${fulfilment}: ${order.collectionTime}\nDestination: ${destination}\nPayment: ${payment}\n\n${itemText}\n\nTotal: ${money(order.totalCents)}\n\nView your orders: ${publicUrl()}/account\n\nFOND · Midpoint Hub`;
  const content = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 22px;background:#f8faf9;border:1px solid ${BRAND.line};border-radius:10px"><tr><td style="padding:10px 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${row('Order', order.reference)}${row('Status', statusLabel(event))}${row(fulfilment, order.collectionTime)}${row('Destination', destination)}${row('Payment', payment)}</table></td></tr></table><p style="margin:0 0 8px;color:${BRAND.ink};font-size:12px;line-height:17px;font-weight:800;letter-spacing:1px;text-transform:uppercase">Your order</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${itemsHtml}<tr><td style="padding:15px 0 0;border-top:2px solid ${BRAND.green};color:${BRAND.ink};font-size:14px;line-height:20px;font-weight:800">Total</td><td align="right" style="padding:15px 0 0;border-top:2px solid ${BRAND.green};color:${BRAND.ink};font-size:17px;line-height:20px;font-weight:800">${escapeHtml(money(order.totalCents))}</td></tr></table>`;
  return { subject, text, html: layout({ preview: `${copy.eyebrow}: ${order.reference}.`, eyebrow: copy.eyebrow, title: copy.title, intro: copy.intro(order), content, button: { label: 'View my FOND orders', href: `${publicUrl()}/account` }, footer: 'This is a service email about an order placed with FOND. Reply to the contact details shown on the FOND website if you need help.' }) };
}
