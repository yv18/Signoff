import sharp from 'sharp';
import { asyncRoute, ApiError } from '../middleware/error.js';
import { put } from '../services/storage.service.js';
import { Signature } from '../models/Signature.js';

/**
 * Uploaded images are re-encoded through sharp before they are stored. That
 * strips EXIF (including GPS coordinates), normalises the format, and means a
 * malicious file cannot survive as-is on disk.
 */
export const uploadAsset = asyncRoute(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose an image to upload.');

  const kind = req.params.kind; // 'photo' | 'logo'
  if (!['photo', 'logo'].includes(kind)) throw new ApiError(400, 'Unknown asset type.');

  const sig = await Signature.findOne({ _id: req.params.id, userId: req.user._id });
  if (!sig) throw new ApiError(404, 'Signature not found.');

  const size = kind === 'photo' ? 320 : 400;
  const processed = await sharp(req.file.buffer)
    .rotate()
    .resize(size, size, { fit: kind === 'photo' ? 'cover' : 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const key = `assets/${req.user._id}/${sig._id}-${kind}-${Date.now()}.png`;
  const url = await put(key, processed, 'image/png');

  sig.assets[kind === 'photo' ? 'photoUrl' : 'logoUrl'] = url;
  sig.render.url = '';
  await sig.save();

  res.json({ url, signature: sig.toPublic() });
});

export const clearAsset = asyncRoute(async (req, res) => {
  const sig = await Signature.findOne({ _id: req.params.id, userId: req.user._id });
  if (!sig) throw new ApiError(404, 'Signature not found.');
  sig.assets[req.params.kind === 'photo' ? 'photoUrl' : 'logoUrl'] = '';
  sig.render.url = '';
  await sig.save();
  res.json({ signature: sig.toPublic() });
});
