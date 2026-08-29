import { z } from 'zod';
import { Signature } from '../models/Signature.js';
import { ApiError, asyncRoute } from '../middleware/error.js';
import { TEMPLATES, ANIMATIONS } from '../templates/catalog.js';
import { renderSignatureGif } from '../services/render.service.js';
import { buildEmailHtml } from '../templates/emailHtml.js';
import { env } from '../config/env.js';

const optional = (max = 200) => z.string().trim().max(max).optional().default('');

export const signatureSchema = z.object({
  label: optional(60),
  fullName: optional(80),
  role: optional(80),
  company: optional(80),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')]).optional().default(''),
  phone: optional(40),
  website: optional(120),
  location: optional(120),
  tagline: optional(160),
  ctaLabel: optional(30),
  ctaUrl: optional(200),
  social: z
    .object({
      linkedin: optional(200),
      x: optional(200),
      instagram: optional(200),
      youtube: optional(200)
    })
    .optional()
    .default({}),
  templateId: z.enum(TEMPLATES.map((t) => t.id)).optional().default('beside'),
  animationId: z.enum(ANIMATIONS.map((a) => a.id)).optional().default('rise'),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #6366F1.')
    .optional()
    .default('#6366F1'),
  avatarShape: z.enum(['circle', 'rounded', 'square']).optional().default('rounded'),
  verified: z.boolean().optional().default(false)
});

export const catalog = (req, res) => {
  res.json({ templates: TEMPLATES, animations: ANIMATIONS });
};

export const list = asyncRoute(async (req, res) => {
  const items = await Signature.find({ userId: req.user._id }).sort('-updatedAt');
  res.json({ signatures: items.map((s) => s.toPublic()) });
});

export const getOne = asyncRoute(async (req, res) => {
  const sig = await Signature.findOne({ _id: req.params.id, userId: req.user._id });
  if (!sig) throw new ApiError(404, 'Signature not found.');
  res.json({ signature: sig.toPublic() });
});

export const create = asyncRoute(async (req, res) => {
  const sig = await Signature.create({ ...req.body, userId: req.user._id });
  res.status(201).json({ signature: sig.toPublic() });
});

export const update = asyncRoute(async (req, res) => {
  const sig = await Signature.findOne({ _id: req.params.id, userId: req.user._id });
  if (!sig) throw new ApiError(404, 'Signature not found.');

  Object.assign(sig, req.body);
  // Any content change invalidates the rendered asset.
  sig.render.url = '';
  await sig.save();

  res.json({ signature: sig.toPublic() });
});

export const remove = asyncRoute(async (req, res) => {
  const sig = await Signature.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!sig) throw new ApiError(404, 'Signature not found.');
  res.json({ ok: true });
});

/** Render the GIF and hand back the paste-ready email markup. */
export const publish = asyncRoute(async (req, res) => {
  const sig = await Signature.findOne({ _id: req.params.id, userId: req.user._id });
  if (!sig) throw new ApiError(404, 'Signature not found.');

  const plain = sig.toPublic();
  const { url, bytes, version } = await renderSignatureGif({ ...plain, id: sig._id.toString() });

  sig.render = { url, bytes, version, renderedAt: new Date() };
  await sig.save();

  const html = buildEmailHtml(plain, {
    assetUrl: url,
    iconBase: `${env.PUBLIC_URL}/static/icons`
  });

  const warning = env.PUBLIC_URL_IS_REACHABLE
    ? null
    : `Images are hosted at ${env.PUBLIC_URL}, which email clients cannot reach. ` +
      `The signature will show broken images in Gmail and Outlook until PUBLIC_URL ` +
      `points at a public HTTPS host. Re-render after changing it.`;

  res.json({ signature: sig.toPublic(), html, bytes, warning });
});
