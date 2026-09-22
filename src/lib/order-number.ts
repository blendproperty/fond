import { randomBytes } from 'node:crypto';

// Eight Crockford-style characters provide a short number that is easy to
// quote while retaining enough entropy for unauthenticated order tracking.
// Ambiguous characters (0/O and 1/I) are deliberately excluded.
const ALPHABET='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateOrderNumber(){
  const bytes=randomBytes(8);
  const code=Array.from(bytes,byte=>ALPHABET[byte&31]).join('');
  return `FOND-${code.slice(0,4)}-${code.slice(4)}`;
}
