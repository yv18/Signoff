import { encrypt, decrypt } from './crypto.js';

/**
 * Mongoose SchemaType helper. Values are encrypted on the way into the
 * database and decrypted on the way out, so application code reads and writes
 * plain strings and never has to remember to call the cipher itself.
 */
export const encryptedString = (extra = {}) => ({
  type: String,
  trim: true,
  set: encrypt,
  get: decrypt,
  default: '',
  ...extra
});

/** Apply to any schema that uses encryptedString, so getters run on output. */
export function withGetters(schema) {
  schema.set('toJSON', { getters: true, virtuals: true });
  schema.set('toObject', { getters: true, virtuals: true });
  return schema;
}
