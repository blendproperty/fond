import type { OrderRecord, OrderStatus } from './orders';
import {renderMessageText,type EmailBanner,type EmailMessageKey} from './message-template-config';
import {publishedMessageTemplates} from './message-templates';

export type EmailMessage = { subject: string; text: string; html: string };

const BRAND = {
  ink: '#102f2a',
  green: '#173f37',
  accent: '#a23828',
  aqua: '#69c9e8',
  aquaLight: '#dff4fb',
  mist: '#f2f3f1',
  paper: '#ffffff',
  slate: '#5d6f6b',
  line: '#dfe6e3',
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character] ?? character));

const money = (cents: number) => `R ${(cents / 100).toFixed(2).replace('.', ',')}`;
const publicUrl = () => (process.env.FOND_PUBLIC_URL ?? 'https://fond.mid-point.co.za').replace(/\/$/, '');
const localDate = (value: string) => new Intl.DateTimeFormat('en-ZA', {
  timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

function detailRow(label: string, value: string) {
  return `<tr><td style="padding:3px 12px 3px 0;color:${BRAND.slate};font-size:11px;line-height:16px;font-weight:700;vertical-align:top;white-space:nowrap">${escapeHtml(label)}:</td><td style="padding:3px 0;color:${BRAND.ink};font-size:11px;line-height:16px;vertical-align:top">${escapeHtml(value)}</td></tr>`;
}

function divider() {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:1px;background:${BRAND.line};font-size:1px;line-height:1px">&nbsp;</td></tr></table>`;
}

const absoluteUrl=(value:string)=>value.startsWith('/')?`${publicUrl()}${value}`:value;

function promotionPanel(banner:EmailBanner) {
  if(!banner.enabled)return '';
  const image=banner.imageUrl?`<tr><td><img src="${escapeHtml(absoluteUrl(banner.imageUrl))}" width="500" alt="${escapeHtml(banner.imageAlt)}" style="display:block;width:100%;max-width:500px;height:auto;border:0"></td></tr>`:'';
  const button=banner.buttonLabel&&banner.buttonUrl?`<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td bgcolor="${BRAND.aqua}" style="border-radius:20px"><a href="${escapeHtml(absoluteUrl(banner.buttonUrl))}" style="display:inline-block;padding:10px 19px;color:${BRAND.ink};text-decoration:none;font-size:11px;line-height:14px;font-weight:800">${escapeHtml(banner.buttonLabel)}</a></td></tr></table>`:'';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;background:${BRAND.green};border-radius:9px;overflow:hidden">${image}<tr><td style="padding:26px 24px;text-align:center">${banner.eyebrow?`<p style="margin:0 0 6px;color:${BRAND.aqua};font-size:10px;line-height:14px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase">${escapeHtml(banner.eyebrow)}</p>`:''}<p style="margin:0 0 7px;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:31px;font-weight:700">${escapeHtml(banner.title)}</p><p style="margin:0 auto ${button?'18px':'0'};max-width:360px;color:#d9e7e3;font-size:12px;line-height:18px">${escapeHtml(banner.body)}</p>${button}</td></tr></table>`;
}

function receiptLayout(input: {
  preview: string;
  title: string;
  statusLine: string;
  content: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.mist};color:${BRAND.ink};font-family:Arial,'Helvetica Neue',sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.preview)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${BRAND.mist}"><tr><td align="center" style="padding:30px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:${BRAND.paper}">
<tr><td align="center" style="padding:30px 24px 18px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="52" height="52" align="center" valign="middle" bgcolor="${BRAND.green}" style="width:52px;height:52px;border-radius:12px;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:52px;font-weight:700">fond<span style="color:${BRAND.aqua}">.</span></td></tr></table></td></tr>
<tr><td bgcolor="${BRAND.aqua}" style="padding:13px 22px;text-align:center"><p style="margin:0;color:${BRAND.ink};font-size:15px;line-height:20px;font-weight:800">${escapeHtml(input.title)}</p><p style="margin:2px 0 0;color:${BRAND.ink};font-size:10px;line-height:15px">${escapeHtml(input.statusLine)}</p></td></tr>
<tr><td style="padding:28px 30px 26px">${input.content}</td></tr>
<tr><td bgcolor="${BRAND.aqua}" style="padding:22px 28px;text-align:center"><p style="margin:0 0 5px;color:${BRAND.ink};font-size:12px;line-height:17px;font-weight:800">Need help with your order?</p><p style="margin:0;color:${BRAND.ink};font-size:10px;line-height:16px">${escapeHtml(input.footer)}</p><p style="margin:8px 0 0"><a href="${escapeHtml(publicUrl())}" style="color:${BRAND.ink};font-size:10px;line-height:15px;font-weight:800">fond.mid-point.co.za</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

function sectionTitle(value: string) {
  return `<p style="margin:0 0 13px;color:${BRAND.ink};font-size:13px;line-height:18px;font-weight:800">${escapeHtml(value)}</p>`;
}

export function buildControlledTestEmail(recipient = 'Your email address'): EmailMessage {
  const templates=publishedMessageTemplates();
  const subject = 'Your FOND email updates are ready';
  const text = `FOND Midpoint Hub\n\nYour FOND email updates are ready.\n\nTransactional email is connected.\nRecipient: ${recipient}\nSender: FOND Midpoint <orders@fond.mid-point.co.za>\nStatus: Connected\n\nOrder confirmations and status updates will use this verified FOND channel.\n\nVisit FOND: ${publicUrl()}\n\nFOND · Midpoint Hub`;
  const details = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${detailRow('Email', recipient)}${detailRow('From', 'FOND Midpoint')}${detailRow('Address', 'orders@fond.mid-point.co.za')}${detailRow('Status', 'Connected and ready')}</table>`;
  const content = `${sectionTitle('Your email details')}${details}<div style="height:22px;line-height:22px">&nbsp;</div>${divider()}<div style="height:22px;line-height:22px">&nbsp;</div>${sectionTitle('FOND Midpoint')}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:0 18px 0 0;color:${BRAND.ink};font-size:12px;line-height:18px"><strong>Transactional order updates</strong><br><span style="color:${BRAND.slate};font-size:10px;line-height:16px">Order received · payment confirmed · accepted · ready</span></td><td align="right" valign="top" style="color:${BRAND.green};font-size:12px;line-height:18px;font-weight:800">ACTIVE</td></tr></table><div style="height:22px;line-height:22px">&nbsp;</div>${divider()}<p style="margin:20px 0 0;color:${BRAND.ink};font-size:11px;line-height:18px">This controlled message confirms that FOND can send clear order receipts and progress updates from its verified address. No action is required.</p>${promotionPanel(templates.email.banner)}`;
  return { subject, text, html: receiptLayout({ preview: 'FOND transactional email is connected and ready.', title: 'Your FOND email updates are ready', statusLine: 'Transactional email is connected', content, footer: templates.email.footer }) };
}

export function buildVerificationEmail(code: string): EmailMessage {
  const templates=publishedMessageTemplates();
  const subject = 'Your FOND verification code';
  const text = `FOND Midpoint Hub\n\nVerify your email address\n\nYour verification code is ${code}.\n\nIt expires in 10 minutes. If you did not request this code, you can ignore this email.\n\nOpen your account: ${publicUrl()}/account\n\nFOND · Midpoint Hub`;
  const content = `${sectionTitle('Your verification code')}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.aquaLight};border:1px solid #b9e4f2"><tr><td align="center" style="padding:24px"><p style="margin:0;color:${BRAND.ink};font-family:'Courier New',monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:8px">${escapeHtml(code)}</p><p style="margin:7px 0 0;color:${BRAND.slate};font-size:10px;line-height:15px">Expires in 10 minutes</p></td></tr></table><p style="margin:20px 0 0;color:${BRAND.ink};font-size:11px;line-height:18px">Enter this six-digit code in your FOND account. If you did not request it, you can safely ignore this message. FOND will never ask you to send this code to anyone.</p>${promotionPanel(templates.email.banner)}`;
  return { subject, text, html: receiptLayout({ preview: `Your FOND verification code is ${code}.`, title: 'Verify your FOND email address', statusLine: 'Use the secure code below within 10 minutes', content, footer: 'This security message was requested from your FOND account.' }) };
}

const statusLabel = (status: OrderStatus) => ({ received: 'Received', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }[status]);

export function buildOrderEmail(order: OrderRecord, event: 'received' | 'accepted' | 'ready' | 'completed'): EmailMessage {
  const templates=publishedMessageTemplates();
  const fulfilment = order.fulfillment === 'delivery' ? 'Delivery' : 'Collection';
  const payment = order.paymentMethod === 'yoco_online' ? 'Paid securely online' : 'Pay in person on collection';
  const destination = order.fulfillment === 'delivery' ? [order.building, order.company].filter(Boolean).join(' · ') : 'FOND · Midpoint Hub';
  const itemText = order.lines.map(line => `${line.quantity} × ${line.name}${line.modifiers?.length ? ` (${line.modifiers.map(modifier => modifier.name).join(', ')})` : ''} — ${money(line.subtotalCents)}`).join('\n');
  const itemsHtml = order.lines.map(line => `<tr><td style="padding:8px 16px 8px 0;color:${BRAND.ink};font-size:11px;line-height:17px;vertical-align:top"><strong>${line.quantity} × ${escapeHtml(line.name)}</strong>${line.modifiers?.length ? `<br><span style="color:${BRAND.slate};font-size:10px">${escapeHtml(line.modifiers.map(modifier => modifier.name).join(' · '))}</span>` : ''}</td><td align="right" valign="top" style="padding:8px 0;color:${BRAND.ink};font-size:11px;line-height:17px;font-weight:700;white-space:nowrap">${escapeHtml(money(line.subtotalCents))}</td></tr>`).join('');
  const amountDue = order.paymentMethod === 'yoco_online' ? 0 : order.totalCents;
  const key:EmailMessageKey=event==='ready'?(order.fulfillment==='delivery'?'readyDelivery':'readyCollection'):event;
  const values={customerName:order.customerName,reference:order.reference,prepMinutes:order.estimatedPrepMinutes,collectionTime:order.collectionTime,destination,total:money(order.totalCents)};
  const configured=templates.email.templates[key],subject=renderMessageText(configured.subject,values),title=renderMessageText(configured.title,values),status=renderMessageText(configured.status,values),intro=renderMessageText(configured.intro,values);
  const text = `FOND Midpoint Hub\n\n${title}\n${status}\n\n${intro}\n\nYOUR ORDER DETAILS\nOrder: ${order.reference}\nDate: ${localDate(order.createdAt)}\nName: ${order.customerName}\nEmail: ${order.customerEmail ?? 'Not supplied'}\nMobile: ${order.contactNumber ?? 'Not supplied'}\nStatus: ${statusLabel(event)}\nFulfilment: ${fulfilment}\n${fulfilment}: ${order.collectionTime}\nDestination: ${destination}\nPayment: ${payment}${order.note ? `\nNotes: ${order.note}` : ''}\n\n${itemText}\n\nSubtotal: ${money(order.totalCents)}\nTotal: ${money(order.totalCents)}\nAmount due: ${money(amountDue)}\n\nTrack your order: ${publicUrl()}/account\n\nFOND · Midpoint Hub`;
  const details = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${detailRow('Order', order.reference)}${detailRow('Date', localDate(order.createdAt))}${detailRow('Name', order.customerName)}${order.customerEmail ? detailRow('Email', order.customerEmail) : ''}${order.contactNumber ? detailRow('Mobile', order.contactNumber) : ''}${detailRow('Status', statusLabel(event))}${detailRow('Fulfilment', fulfilment)}${detailRow(fulfilment, order.collectionTime)}${detailRow('Destination', destination)}${detailRow('Payment', payment)}${order.note ? detailRow('Notes', order.note) : ''}</table>`;
  const totals = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 0"><tr><td style="padding:4px 16px 4px 0;color:${BRAND.slate};font-size:10px;line-height:15px;text-align:right">Subtotal</td><td align="right" style="padding:4px 0;color:${BRAND.ink};font-size:10px;line-height:15px;font-weight:700;white-space:nowrap">${escapeHtml(money(order.totalCents))}</td></tr><tr><td style="padding:4px 16px 4px 0;color:${BRAND.slate};font-size:10px;line-height:15px;text-align:right">Payment</td><td align="right" style="padding:4px 0;color:${BRAND.ink};font-size:10px;line-height:15px;font-weight:700">${escapeHtml(payment)}</td></tr><tr><td style="padding:7px 16px 3px 0;border-top:1px solid ${BRAND.line};color:${BRAND.ink};font-size:11px;line-height:16px;font-weight:800;text-align:right">Total</td><td align="right" style="padding:7px 0 3px;border-top:1px solid ${BRAND.line};color:${BRAND.ink};font-size:12px;line-height:16px;font-weight:800;white-space:nowrap">${escapeHtml(money(order.totalCents))}</td></tr><tr><td style="padding:4px 16px 0 0;color:${BRAND.ink};font-size:11px;line-height:16px;font-weight:800;text-align:right">Amount due</td><td align="right" style="padding:4px 0 0;color:${BRAND.accent};font-size:12px;line-height:16px;font-weight:800;white-space:nowrap">${escapeHtml(money(amountDue))}</td></tr></table>`;
  const content = `${sectionTitle('Your order details')}${details}<div style="height:22px;line-height:22px">&nbsp;</div>${divider()}<div style="height:22px;line-height:22px">&nbsp;</div>${sectionTitle('FOND Midpoint')}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${itemsHtml}</table>${totals}<div style="height:20px;line-height:20px">&nbsp;</div>${divider()}<p style="margin:20px 0 0;color:${BRAND.ink};font-size:11px;line-height:18px">${escapeHtml(intro)} Keep your reference <strong>${escapeHtml(order.reference)}</strong> handy if you need help. You can follow the order from your FOND account.</p>${promotionPanel(templates.email.banner)}`;
  return { subject, text, html: receiptLayout({ preview: `${title}: ${order.reference}.`, title, statusLine: status, content, footer: `${templates.email.footer} Quote ${order.reference} if you contact the FOND team about this order.` }) };
}
