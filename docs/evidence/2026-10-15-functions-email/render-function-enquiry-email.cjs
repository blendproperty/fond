function renderFunctionEnquiry(p) {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const undecided = value => !value || /^(not sure|not provided|not specified)$/i.test(String(value).trim());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(p.date || '')
    ? new Date(p.date + 'T12:00:00Z').toLocaleDateString('en-ZA', {day:'numeric', month:'long', year:'numeric', timeZone:'Africa/Johannesburg'}) : p.date;
  const company = /^private(?: function)?$/i.test(p.company || '') ? 'Private function' : p.company;
  const phoneDigits = String(p.replyPhone || '').replace(/\D/g, '');
  const emailLink = 'mailto:' + encodeURIComponent(p.email || '');
  const phoneLink = 'https://wa.me/' + phoneDigits;
  const test = /^TEST\b/i.test(p.contactPerson || '');
  const row = (label, value, last=false) => '<tr><th scope="row" style="width:34%;padding:13px 16px;text-align:left;vertical-align:top;font-weight:400;color:#66736e;background:#f6f8f6;'+(last?'':'border-bottom:1px solid #e2e8e3;')+'">'+esc(label)+'</th><td style="padding:13px 16px;text-align:left;vertical-align:top;color:#1d3029;overflow-wrap:anywhere;word-break:break-word;'+(last?'':'border-bottom:1px solid #e2e8e3;')+'">'+esc(value || 'Not supplied')+'</td></tr>';
  const section = (title, rows) => '<h2 style="margin:27px 0 11px;font-size:16px;line-height:22px;font-weight:700;color:#173e35;">'+title+'</h2><table role="table" aria-label="'+title+'" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8e3;border-collapse:separate;border-spacing:0;border-radius:8px;font-size:14px;line-height:21px;">'+rows+'</table>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Midpoint Hub | Function enquiry</title></head>'+
    '<body style="margin:0;padding:0;background:#f2f4f0;font-family:Arial,Helvetica,sans-serif;color:#243b31;-webkit-text-size-adjust:100%;">'+
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">'+esc(date)+' · '+esc(p.guests)+' guests · '+esc(p.style)+' · '+esc(p.contactPerson)+'</div>'+
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f2f4f0;"><tr><td align="center" style="padding:24px 12px;">'+
    '<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #dfe6df;border-radius:12px;overflow:hidden;">'+
    '<tr><td style="padding:26px 28px;background:#173e35;color:#ffffff;border-radius:11px 11px 0 0;">'+
    '<p style="margin:0 0 18px;font-size:12px;line-height:16px;font-weight:700;letter-spacing:2px;color:#c8dcc8;">MIDPOINT HUB</p>'+
    '<h1 style="margin:0;font-size:27px;line-height:34px;letter-spacing:-0.4px;color:#ffffff;">A new function enquiry</h1>'+
    '<p style="margin:9px 0 0;font-size:14px;line-height:21px;color:#dce8dc;">Functions &amp; events · Submitted via WhatsApp</p></td></tr>'+
    '<tr><td style="padding:24px 28px 28px;">'+
    (test?'<p style="margin:0 0 20px;padding:10px 13px;border:1px solid #e6d8a9;border-radius:6px;background:#fff8e4;font-size:12px;line-height:18px;color:#72551b;"><strong>TEST ENQUIRY</strong> &nbsp; For checking the enquiry service. No booking requested.</p>':'')+
    '<p style="margin:0 0 7px;font-size:15px;line-height:23px;">Hi Michelle,</p>'+
    '<p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#56675d;">A customer would like to plan an event at Midpoint Hub. Their enquiry details are below.</p>'+
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#eef4ec;border:1px solid #dbe6d7;border-radius:8px;"><tr><td style="padding:17px 18px;">'+
    '<p style="margin:0 0 6px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1px;color:#58704c;">PREFERRED EVENT DATE</p>'+
    '<p style="margin:0;font-size:21px;line-height:28px;font-weight:700;color:#173e35;">'+esc(date)+'</p>'+
    '<p style="margin:8px 0 0;font-size:14px;line-height:21px;color:#3d5545;"><strong>'+esc(p.guests)+' guests</strong> &nbsp;·&nbsp; '+esc(p.style)+'</p></td></tr></table>'+
    section('Contact details',row('Contact person',p.contactPerson)+row('Email address',p.email)+row('Contact number',p.replyPhone)+row('Company / function',company,true))+
    section('Event details',row('Preferred date',date)+row('Number of guests',p.guests)+row('Catering style',p.style)+row('Occasion / theme',undecided(p.occasion)?'To be discussed':p.occasion)+row('Estimated budget',undecided(p.budget)?'To be discussed':p.budget)+row('Budget basis',undecided(p.budgetBasis)?'To be discussed':p.budgetBasis,true))+
    '<h2 style="margin:27px 0 8px;font-size:16px;line-height:22px;color:#173e35;">Follow up with the customer</h2>'+
    '<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#56675d;">Please confirm availability, the venue, catering and pricing.</p>'+
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background:#173e35;"><a href="'+esc(emailLink)+'" style="display:inline-block;padding:12px 17px;border:1px solid #173e35;border-radius:6px;color:#ffffff;text-decoration:none;font-size:14px;line-height:20px;font-weight:700;">Reply by email</a></td></tr></table>'+
    (/^[1-9]\d{7,14}$/.test(phoneDigits)?'<p style="margin:13px 0 0;font-size:13px;line-height:20px;"><a href="'+esc(phoneLink)+'" style="color:#285d43;text-decoration:underline;">Contact the customer on WhatsApp</a></p>':'')+
    '<p style="margin:25px 0 0;padding-top:17px;border-top:1px solid #e2e8e3;font-size:12px;line-height:19px;color:#6d786f;"><strong style="color:#465b4d;">Enquiry only — no booking confirmed.</strong><br>Reference: '+esc(p.reference)+'</p>'+
    '</td></tr></table><p style="margin:16px 0 0;font-size:11px;line-height:18px;color:#7b867d;">MIDPOINT HUB &nbsp;·&nbsp; FUNCTIONS &amp; EVENTS</p></td></tr></table></body></html>';
}
module.exports = renderFunctionEnquiry;
