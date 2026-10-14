const input = $input.first().json;
const body = input.body ?? input;
if (!body || typeof body !== 'object' || JSON.stringify(body).length > 30000) throw new Error('Invalid enquiry payload');
const leaves = [];
function walk(value, path = '', depth = 0) {
  if (depth > 10) throw new Error('Invalid enquiry depth');
  if (Array.isArray(value)) { value.forEach((entry, index) => walk(entry, path + '[' + index + ']', depth + 1)); return; }
  if (value && typeof value === 'object') { for (const [key, entry] of Object.entries(value)) { if (/token|secret|password|authorization|cookie|otp/i.test(key)) continue; walk(entry, path ? path + ' / ' + key : key, depth + 1); } return; }
  if (typeof value === 'string' || typeof value === 'number') leaves.push({path, value: String(value).trim()});
}
walk(body);
if (!leaves.some(entry => entry.value === 'Send to Michelle')) return [];
const lines = leaves.filter(entry => entry.value && !/^(?:bot_id|flow_id|subscriber_id|postback_id|campaign_id)$/i.test(entry.path)).map(entry => entry.path + ': ' + entry.value);
if (lines.length < 10) throw new Error('Incomplete function enquiry');
const test = leaves.some(entry => /^TEST\b/i.test(entry.value));
return [{json:{subject:(test ? 'TEST - ' : '') + 'Midpoint Hub - WhatsApp function enquiry', text:'Hi Michelle,\n\nA customer completed the Functions and Events enquiry in WhatsApp and chose Send to Michelle.\n\n' + lines.join('\n') + '\n\nThis is an enquiry, not a confirmed booking. Please contact the customer to confirm date, capacity, catering and pricing.\n\nMidpoint Hub', receivedAt:new Date().toISOString()}}];
