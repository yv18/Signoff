import mongoose from 'mongoose';
import { encryptedString, withGetters } from '../lib/encryptedField.js';

/**
 * A sign-up that is waiting on email OTP verification. One per email (the blind
 * index is unique) so re-requesting a code just refreshes this document. Mongo's
 * TTL index drops it 10 minutes after `expiresAt`, so an abandoned flow never
 * accumulates — important under a flood of registration attempts.
 *
 * The password is already bcrypt-hashed here; it is never stored in the clear,
 * not even briefly.
 */
const pendingSchema = new mongoose.Schema(
  {
    emailHash: { type: String, required: true, unique: true, index: true },
    email: encryptedString({ required: true }),
    name: encryptedString(),
    passwordHash: { type: String, required: true },
    otpHash: { type: String, required: true }, // sha256 of the 6-digit code
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

pendingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
withGetters(pendingSchema);

export const PendingRegistration = mongoose.model('PendingRegistration', pendingSchema);
