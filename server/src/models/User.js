import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encryptedString, withGetters } from '../lib/encryptedField.js';
import { hashLookup } from '../lib/crypto.js';

const userSchema = new mongoose.Schema(
  {
    // Blind index. Deterministic, non-reversible, the only queryable form
    // of the email address.
    emailHash: { type: String, required: true, unique: true, index: true },

    // Personal data, encrypted at rest with AES-256-GCM.
    email: encryptedString({ required: true }),
    name: encryptedString(),

    passwordHash: { type: String, required: true, select: false },

    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

withGetters(userSchema);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name
  };
};

userSchema.statics.findByEmail = function findByEmail(email, withPassword = false) {
  const q = this.findOne({ emailHash: hashLookup(email) });
  return withPassword ? q.select('+passwordHash') : q;
};

export const User = mongoose.model('User', userSchema);
