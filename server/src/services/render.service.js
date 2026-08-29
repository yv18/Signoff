import sharp from 'sharp';
import GIFEncoder from 'gif-encoder-2';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildCardSvg, CARD_WIDTH, CARD_HEIGHT } from '../templates/cardSvg.js';
import { put, localRoot } from './storage.service.js';
import { env } from '../config/env.js';

/**
 * Turns a signature into an animated GIF.
 *
 * Email clients cannot run CSS or JavaScript, so the animation has to ship as
 * a raster image. Constraints that shape the numbers below:
 *   - Outlook on Windows shows frame 1 only, so frame 1 is the resting state.
 *   - Signatures are appended to every message, so keep the file small.
 */

const FRAMES = 16;
const DELAY_MS = 70;
const HOLD_FRAMES = 6; // frames held on the finished state before looping

async function toDataUri(url) {
  if (!url) return '';
  try {
    let buf;
    const marker = '/static/';
    if (env.STORAGE_DRIVER === 'local' && url.includes(marker)) {
      // Local driver: read straight off disk — skips a network round-trip and
      // works before the HTTP server is even listening.
      const key = url.slice(url.indexOf(marker) + marker.length);
      buf = await fs.readFile(path.join(localRoot, key));
    } else {
      // S3 / remote: fetch it. The object is public, so a plain GET is enough.
      const res = await fetch(url);
      if (!res.ok) return '';
      buf = Buffer.from(await res.arrayBuffer());
    }
    const out = await sharp(buf).resize(160, 160, { fit: 'inside' }).png().toBuffer();
    return `data:image/png;base64,${out.toString('base64')}`;
  } catch {
    return '';
  }
}

async function frameBuffer(data, progress, media) {
  const svg = buildCardSvg(data, { progress, ...media });
  return sharp(Buffer.from(svg))
    .resize(CARD_WIDTH, CARD_HEIGHT)
    .flatten({ background: '#ffffff' }) // composite onto white, drop transparency
    .ensureAlpha() // gif-encoder-2's addFrame reads RGBA (4 bytes/px); a bare
    // .raw() RGB buffer makes it stride past the data — the frame shears and
    // tiles across, with a black band where it runs out of bytes.
    .raw()
    .toBuffer();
}

/**
 * @param {object} signature  decrypted plain-object signature
 * @returns {{ url: string, bytes: number }}
 */
export async function renderSignatureGif(signature) {
  const media = {
    photoDataUri: await toDataUri(signature.assets?.photoUrl),
    logoDataUri: await toDataUri(signature.assets?.logoUrl)
  };

  // useOptimizer (4th arg) stays false: it makes gif-encoder-2 reuse an earlier
  // frame's neuquant palette for later "similar" frames, so the pale mid-
  // animation frames get quantised against the palette of the fully-opaque
  // resting frame and wash out. Every frame is a full opaque 560x200 image, so
  // there is nothing to gain from it anyway.
  const encoder = new GIFEncoder(CARD_WIDTH, CARD_HEIGHT, 'neuquant', false);
  encoder.setDelay(DELAY_MS);
  encoder.setRepeat(0); // loop forever
  encoder.setQuality(10); // lower is better quality, larger file
  encoder.start();

  // Frame 1 is the finished signature. Outlook stops here, and it must read
  // correctly on its own.
  const rest = await frameBuffer(signature, 1, media);
  encoder.addFrame(rest);

  for (let i = 0; i < FRAMES; i += 1) {
    const progress = i / (FRAMES - 1);
    encoder.addFrame(await frameBuffer(signature, progress, media));
  }

  for (let i = 0; i < HOLD_FRAMES; i += 1) encoder.addFrame(rest);

  encoder.finish();
  const buffer = encoder.out.getData();

  const version = (signature.render?.version || 0) + 1;
  const key = `signatures/${signature.id || signature._id}-v${version}.gif`;
  const url = await put(key, buffer, 'image/gif');

  return { url, bytes: buffer.length, version };
}

/** A single still frame, used for the editor thumbnail and social previews. */
export async function renderSignaturePng(signature) {
  const media = {
    photoDataUri: await toDataUri(signature.assets?.photoUrl),
    logoDataUri: await toDataUri(signature.assets?.logoUrl)
  };
  const svg = buildCardSvg(signature, { progress: 1, ...media });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export const RENDER_LIMITS = { FRAMES, DELAY_MS, MAX_BYTES: 300 * 1024, env: env.NODE_ENV };
