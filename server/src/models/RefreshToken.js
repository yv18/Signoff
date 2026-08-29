import mongoose from 'mongoose';

/**
 * One document per issued refresh token. Tokens are stored as SHA-256 hashes,
 * never in raw form. Rotation replaces the document; a replayed token that has
 * already been rotated revokes the whole family, which is how stolen-token
 * reuse is detected.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    family: { type: String, required: true, index: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: '' },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// Mongo removes expired documents automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
