import crypto from 'node:crypto';

const line = (name, bytes) =>
  `${name}=${crypto.randomBytes(bytes).toString('hex')}`;

console.log('\nPaste these into server/.env\n');
console.log(line('JWT_ACCESS_SECRET', 48));
console.log(line('JWT_REFRESH_SECRET', 48));
console.log(line('ENCRYPTION_KEY', 32));
console.log(line('LOOKUP_KEY', 32));
console.log('\nENCRYPTION_KEY must stay 32 bytes. Losing it makes stored personal data unrecoverable.\n');
