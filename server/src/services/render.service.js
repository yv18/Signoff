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
 *   - The GIF plays through once and stops on the finished signature (no loop).
 *   - Signatures are appended to every message, so keep the file small.
 */

// The GIF ships at the card's native size (560x200). A bare image inserted into
// a mail client — Gmail's "Insert image > by URL", for one — renders at its own
// pixel size, so this IS the on-screen size; keep it sane. SUPERSAMPLE renders
// each frame larger and downscales it, which antialiases the text and edges so
// it still looks sharp at 1x.
const SUPERSAMPLE = 2;
const OUT_WIDTH = CARD_WIDTH;
const OUT_HEIGHT = CARD_HEIGHT;

const FRAMES = 16;
const DELAY_MS = 70;
const HOLD_FRAMES = 2; // a couple of frames resting on the finished state at the end

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
  // Rasterise the SVG large (density), then let resize() downscale it to the
  // output size — a supersampled, antialiased frame rather than one rendered
  // straight at final size.
  return sharp(Buffer.from(svg), { density: 72 * SUPERSAMPLE })
    .resize(OUT_WIDTH, OUT_HEIGHT)
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
  // resting frame and wash out. Every frame is a full opaque image, so there is
  // nothing to gain from it anyway.
  const encoder = new GIFEncoder(OUT_WIDTH, OUT_HEIGHT, 'neuquant', false);
  encoder.setDelay(DELAY_MS);
  // Netscape loop count 1 → browsers play the animation through twice (initial
  // play + 1 repeat) and then hold on the last frame. setRepeat(0) would loop
  // forever; setRepeat(-1) omits the extension and plays it just once.
  encoder.setRepeat(1);
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

  // Land on the finished signature and dwell there — this is the frame the GIF
  // freezes on once it has played through.
  encoder.setDelay(DELAY_MS * 8);
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
  return sharp(Buffer.from(svg), { density: 72 * SUPERSAMPLE })
    .resize(OUT_WIDTH, OUT_HEIGHT)
    .png()
    .toBuffer();
}

export const RENDER_LIMITS = { FRAMES, DELAY_MS, MAX_BYTES: 300 * 1024, env: env.NODE_ENV };
