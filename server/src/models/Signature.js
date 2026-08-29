import mongoose from 'mongoose';
import { encryptedString, withGetters } from '../lib/encryptedField.js';

/**
 * Everything a person types about themselves is encrypted. Presentation
 * choices (template, animation, colour) are not personal data and stay
 * queryable so we can report on template usage.
 */
const signatureSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, default: 'My signature', trim: true },

    fullName: encryptedString(),
    role: encryptedString(),
    company: encryptedString(),
    email: encryptedString(),
    phone: encryptedString(),
    website: encryptedString(),
    location: encryptedString(),
    tagline: encryptedString(),
    ctaLabel: encryptedString(),
    ctaUrl: encryptedString(),

    social: {
      linkedin: encryptedString(),
      x: encryptedString(),
      instagram: encryptedString(),
      youtube: encryptedString()
    },

    assets: {
      photoUrl: { type: String, default: '' },
      logoUrl: { type: String, default: '' }
    },

    templateId: { type: String, default: 'beside' },
    animationId: { type: String, default: 'rise' },
    accent: { type: String, default: '#6366F1' },
    avatarShape: { type: String, enum: ['circle', 'rounded', 'square'], default: 'rounded' },
    verified: { type: Boolean, default: false }, // blue tick after the name

    render: {
      url: { type: String, default: '' },
      version: { type: Number, default: 0 },
      renderedAt: { type: Date, default: null },
      bytes: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

withGetters(signatureSchema);

signatureSchema.methods.toPublic = function toPublic() {
  const o = this.toObject();
  delete o.__v;
  o.id = this._id.toString();
  delete o._id;
  delete o.userId;
  return o;
};

export const Signature = mongoose.model('Signature', signatureSchema);
