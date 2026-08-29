import { getTemplate } from './catalog.js';

/**
 * Builds one frame of a signature as SVG. sharp rasterizes it; a sequence of
 * frames at increasing `progress` becomes the animated GIF.
 *
 * Frame 0 and the final frame are deliberately identical to the resting state.
 * Outlook on Windows renders only the first frame of a GIF, so the first frame
 * has to be a finished, readable signature rather than a blank canvas.
 */

export const CARD_WIDTH = 560;
export const CARD_HEIGHT = 200;

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])
  );

// Accent values that mean "user hasn't chosen a colour yet" — the black/indigo
// the editor seeds a new signature with. Anything else is a deliberate pick and
// overrides a card template's themed accent.
const NEUTRAL_ACCENTS = new Set(['#0A0A0A', '#000000', '#6366F1']);

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/**
 * Per-part progress. Parts are staggered so the signature assembles rather
 * than appearing all at once.
 */
function partProgress(globalProgress, index, total) {
  const stagger = 0.06;
  const span = Math.max(0.35, 1 - stagger * total);
  const start = index * stagger;
  return clamp((globalProgress - start) / span);
}

/** Returns { opacity, transform, extra } for a part under a given animation. */
function motion(animationId, p, index) {
  const t = easeOut(p);
  switch (animationId) {
    case 'fade':
      return { opacity: t, transform: '' };
    case 'wipe':
      return { opacity: p > 0 ? 1 : 0, transform: '', clip: t };
    case 'settle':
      return { opacity: t, transform: `scale(${0.88 + 0.12 * t})`, origin: true };
    case 'glide':
      return { opacity: t, transform: `translate(${-28 * (1 - t)}, 0)` };
    case 'drop':
      return { opacity: clamp(p * 2), transform: `translate(0, ${-20 * (1 - easeBack(p))})` };
    case 'ignite':
      return { opacity: t, transform: '', glow: 1 - t };
    case 'unfold':
      return { opacity: t, transform: `scale(1, ${0.15 + 0.85 * t})`, origin: true };
    case 'flip':
      // 2-D stand-in for a rotateY hinge from the left edge.
      return { opacity: t, transform: `scale(${0.12 + 0.88 * t}, 1)`, origin: true };
    case 'zoom':
      return { opacity: t, transform: `scale(${1.22 - 0.22 * t})`, origin: true };
    case 'minecraft': {
      // Quantise progress so parts snap in, block by block.
      const q = Math.round(p * 5) / 5;
      const s = 0.6 + 0.4 * q;
      return { opacity: q, transform: `translate(0, ${-14 * (1 - q)}) scale(${s})`, origin: true };
    }
    case 'shatter':
      // Smooth assemble — drift up a touch, no bounce.
      return { opacity: t, transform: `translate(0, ${9 * (1 - t)}) scale(${0.96 + 0.04 * t})`, origin: true };
    case 'rise':
    default:
      return { opacity: t, transform: `translate(0, ${16 * (1 - t)})` };
  }
}

function wrapPart(inner, { animationId, progress, index, total, x, y }) {
  const p = partProgress(progress, index, total);
  const m = motion(animationId, p, index);
  const origin = m.origin ? `transform-origin="${x}px ${y}px"` : '';
  const clipAttr = m.clip !== undefined
    ? ` clip-path="inset(0 ${(1 - m.clip) * 100}% 0 0)"`
    : '';
  const filter = m.glow ? ` filter="url(#ignite)"` : '';
  const transform = m.transform ? ` transform="${m.transform}"` : '';
  return `<g opacity="${m.opacity.toFixed(3)}"${transform} ${origin}${clipAttr}${filter}>${inner}</g>`;
}

const ICONS = {
  mail: 'M2 4h12v8H2z M2 5l6 4 6-4',
  phone: 'M3 2h2.6l1.3 3.2-1.6 1a8 8 0 0 0 4 4l1-1.6L13.5 10v2.6a1.3 1.3 0 0 1-1.4 1.3A11.3 11.3 0 0 1 2 3.4 1.3 1.3 0 0 1 3 2z',
  pin: 'M8 14s4.5-3.7 4.5-7.2A4.5 4.5 0 0 0 3.5 6.8C3.5 10.3 8 14 8 14z',
  globe: 'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M1.5 8h13 M8 1.5a10 10 0 0 1 0 13 10 10 0 0 1 0-13'
};

function iconPath(name, x, y, color, size = 13) {
  const scale = size / 16;
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="${ICONS[name]}"/>
  </g>`;
}

// Rough advance width of a bold Helvetica/Arial string in px. Server-side SVG
// has no font metrics, so this is an estimate — accurate enough to seat the
// verified badge just past the name instead of guessing from character count.
const GLYPH_W = {
  ' ': 0.28, '.': 0.28, ',': 0.28, "'": 0.24, '!': 0.33, ':': 0.3,
  i: 0.28, j: 0.28, l: 0.28, I: 0.33, f: 0.33, t: 0.34, r: 0.43,
  m: 0.86, w: 0.75, M: 0.86, W: 0.95
};
const textWidth = (str, fontSize) =>
  [...String(str)].reduce((sum, ch) => {
    const w =
      GLYPH_W[ch] ??
      (ch >= 'A' && ch <= 'Z' ? 0.68 : /[0-9]/.test(ch) ? 0.58 : 0.55);
    return sum + w * fontSize;
  }, 0);

/**
 * Verified badge — the Material "verified" scalloped mark, the same one the
 * editor preview shows. Drawn as two solid fills (blue star + white tick), not
 * a thin stroke, so it stays sharp through the GIF's 256-colour quantise and
 * the mail-client downscale. (x, y) is the centre.
 */
function verifiedBadge(x, y, size = 16) {
  const s = (size / 24).toFixed(4);
  const ox = (x - size / 2).toFixed(2);
  const oy = (y - size / 2).toFixed(2);
  return `<g transform="translate(${ox} ${oy}) scale(${s})">
    <path fill="#1D9BF0" d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12z"/>
    <path fill="#FFFFFF" d="M10.09 16.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.32z"/>
  </g>`;
}

/**
 * @param {object} data  signature fields (already decrypted plain strings)
 * @param {object} opts  { progress: 0..1, photoDataUri, logoDataUri }
 */
export function buildCardSvg(data, opts = {}) {
  const { progress = 1, photoDataUri = '', logoDataUri = '' } = opts;
  const tpl = getTemplate(data.templateId);
  const th = tpl.theme || {
    bgFrom: '#FFFFFF',
    bgTo: '#FFFFFF',
    fg: '#111111',
    sub: '#555555',
    line: '#E3E3E8',
    accent: data.accent || '#6366F1',
    chip: '#F1F1F6',
    btnText: '#FFFFFF'
  };
  // The accent picker applies to every template. A card template only falls
  // back to its own themed accent while the user is still on a neutral default
  // — so pick a colour in Style and it colours the name highlight, the rule and
  // every contact icon, on any template.
  const chosen = (data.accent || '').trim();
  const accent =
    chosen && !NEUTRAL_ACCENTS.has(chosen.toUpperCase())
      ? chosen
      : tpl.style === 'card'
        ? th.accent
        : chosen || th.accent;
  const anim = data.animationId || 'rise';
  const glassy = Boolean(tpl.glass);
  const mirra = Boolean(tpl.mirra);
  const shardMedia = Boolean(tpl.shardMedia) && Boolean(photoDataUri);
  const shape = data.avatarShape || 'rounded';
  const mediaRx = mirra ? 10 : shape === 'circle' ? null : shape === 'square' ? 3 : 10;

  const parts = [];
  const push = (fn) => parts.push(fn);

  const mediaSize = mirra ? 96 : 76;
  const mediaY = mirra ? 34 : 44;
  // Mirra puts the photo on the right and the text on the left.
  const mediaX = mirra ? CARD_WIDTH - 28 - mediaSize : 28;
  const textX = mirra ? 28 : mediaX + mediaSize + 22;
  let cursorY = 56;

  // --- media -------------------------------------------------------------
  const mcx = mediaX + mediaSize / 2;
  const mcy = mediaY + mediaSize / 2;

  // Frame + clip that follow the chosen avatar shape.
  const mediaClip =
    mediaRx == null
      ? `<circle cx="${mcx}" cy="${mcy}" r="${mediaSize / 2}"/>`
      : `<rect x="${mediaX}" y="${mediaY}" width="${mediaSize}" height="${mediaSize}" rx="${mediaRx}"/>`;
  const mediaFrame = (fill) =>
    mediaRx == null
      ? `<circle cx="${mcx}" cy="${mcy}" r="${mediaSize / 2}" fill="${fill || 'none'}" stroke="${accent}" stroke-width="2"/>`
      : `<rect x="${mediaX}" y="${mediaY}" width="${mediaSize}" height="${mediaSize}" rx="${mediaRx}" fill="${fill || 'none'}" stroke="${accent}" stroke-width="1.5"/>`;

  const LOGO_PAD = 8; // keep the logo inside the shape's inscribed square

  // Mirra: the photo assembles from angled shards. Rendered as its own part so
  // it staggers with the rest; each strip drifts from a small offset to zero.
  if (shardMedia) {
    push(({ index, total }) => {
      const mp = partProgress(progress, index, total);
      const strips = 4;
      const slant = 0.22;
      let g = `<clipPath id="mm">${mediaClip}</clipPath><g clip-path="url(#mm)">`;
      const ov = 2; // overlap so strip edges never show a seam at rest
      for (let s = 0; s < strips; s += 1) {
        const sp = clamp((mp - s * 0.12) / 0.55);
        const dir = s % 2 ? 1 : -1;
        const dx = (1 - sp) * 12 * dir;
        const dy = (1 - sp) * -9 * dir;
        const rot = (1 - sp) * 5 * dir;
        const x0 = mediaX + (s / strips) * mediaSize - (s === 0 ? 0 : ov);
        const x1 = mediaX + ((s + 1) / strips) * mediaSize + (s === strips - 1 ? 0 : ov);
        const sl = slant * mediaSize;
        const cid = `sh${s}`;
        g += `<clipPath id="${cid}"><polygon points="${x0},${mediaY} ${x1},${mediaY} ${x1 - sl},${mediaY + mediaSize} ${x0 - sl},${mediaY + mediaSize}"/></clipPath>
          <g opacity="${sp.toFixed(3)}" transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${rot.toFixed(2)} ${mcx} ${mcy})">
            <image href="${photoDataUri}" x="${mediaX}" y="${mediaY}" width="${mediaSize}" height="${mediaSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${cid})"/>
          </g>`;
      }
      g += `</g>${mediaFrame()}`;
      return `<g>${g}</g>`;
    });
    // fall through: skip the normal media push
  }

  if (!shardMedia) push(({ index, total }) => {
    let inner;
    if (logoDataUri) {
      // White backing so a dark/transparent logo reads on any template;
      // `meet` scales it to fit the padded box without distortion.
      const clipId = `lc${index}`;
      inner = `<clipPath id="${clipId}">${mediaClip}</clipPath>
        ${mediaFrame('#FFFFFF')}
        <image href="${logoDataUri}" x="${mediaX + LOGO_PAD}" y="${mediaY + LOGO_PAD}" width="${mediaSize - LOGO_PAD * 2}" height="${mediaSize - LOGO_PAD * 2}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})"/>`;
    } else if (photoDataUri) {
      inner = `<clipPath id="pc">${mediaClip}</clipPath>
        <image href="${photoDataUri}" x="${mediaX}" y="${mediaY}" width="${mediaSize}" height="${mediaSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#pc)"/>
        ${mediaFrame()}`;
    } else {
      const init = String(data.fullName || '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0] || '')
        .join('')
        .toUpperCase() || 'S';
      inner = `${mediaFrame(th.chip)}
        <text x="${mcx}" y="${mcy + 9}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="26" font-weight="700" fill="${accent}">${esc(init)}</text>`;
    }
    return wrapPart(inner, {
      animationId: anim, progress, index, total, x: mcx, y: mcy
    });
  });

  // --- name --------------------------------------------------------------
  if (data.fullName) {
    const y = cursorY;
    if (glassy) {
      const words = esc(data.fullName).trim().split(/\s+/);
      const last = words.length > 1 ? words.pop() : '';
      const first = words.join(' ');
      const tick = data.verified
        ? verifiedBadge(textX + textWidth(data.fullName, 22) + 13, y - 8, 17)
        : '';
      push(({ index, total }) =>
        wrapPart(
          `<text x="${textX}" y="${y + 2}" font-family="Helvetica,Arial,sans-serif" font-size="22" font-weight="700" fill="${th.fg}">${first}${last ? ' ' : ''}<tspan fill="${accent}">${last}</tspan></text>
           <rect x="${textX}" y="${y + 8}" width="52" height="3" rx="1.5" fill="${accent}"/>${tick}`,
          { animationId: anim, progress, index, total, x: textX, y }
        )
      );
      cursorY += 26;
    } else if (tpl.pixel) {
      push(({ index, total }) =>
        wrapPart(
          `<text x="${textX + 2}" y="${y + 2}" font-family="monospace" font-size="19" font-weight="700" fill="rgba(0,0,0,0.35)">${esc(data.fullName)}</text>
           <text x="${textX}" y="${y}" font-family="monospace" font-size="19" font-weight="700" fill="${th.fg}">${esc(data.fullName)}</text>`,
          { animationId: anim, progress, index, total, x: textX, y }
        )
      );
      cursorY += 21;
    } else {
      const tick = data.verified
        ? verifiedBadge(textX + textWidth(data.fullName, 20) + 12, y - 7, 16)
        : '';
      push(({ index, total }) =>
        wrapPart(
          `<text x="${textX}" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="20" font-weight="700" fill="${th.fg}">${esc(data.fullName)}</text>${tick}`,
          { animationId: anim, progress, index, total, x: textX, y }
        )
      );
      cursorY += 21;
    }
  }

  // --- role / company ----------------------------------------------------
  const roleLine = [data.role, data.company].filter(Boolean);
  if (roleLine.length) {
    const y = cursorY;
    if (glassy) {
      const text = roleLine.map(esc).join('  •  ').toUpperCase();
      push(({ index, total }) =>
        wrapPart(
          `<text x="${textX}" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="2.4" fill="${accent}">${text}</text>`,
          { animationId: anim, progress, index, total, x: textX, y }
        )
      );
      cursorY += 15;
    } else {
      const text = roleLine
        .map((v, i) =>
          i === 0
            ? `<tspan fill="${accent}" font-weight="600">${esc(v)}</tspan>`
            : `<tspan fill="${th.sub}">  |  </tspan><tspan fill="${accent}" font-weight="600">${esc(v)}</tspan>`
        )
        .join('');
      push(({ index, total }) =>
        wrapPart(
          `<text x="${textX}" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="12.5">${text}</text>`,
          { animationId: anim, progress, index, total, x: textX, y }
        )
      );
      cursorY += 14;
    }
  }

  // --- rule --------------------------------------------------------------
  {
    const y = cursorY;
    push(({ index, total }) =>
      wrapPart(
        `<rect x="${textX}" y="${y}" width="230" height="1" fill="${accent}" opacity="0.45"/>`,
        { animationId: anim, progress, index, total, x: textX, y }
      )
    );
    cursorY += 14;
  }

  // --- tagline -----------------------------------------------------------
  if (data.tagline) {
    const y = cursorY;
    push(({ index, total }) =>
      wrapPart(
        `<text x="${textX}" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="11.5" fill="${th.sub}">${esc(data.tagline)}</text>`,
        { animationId: anim, progress, index, total, x: textX, y }
      )
    );
    cursorY += 17;
  }

  // --- contact rows ------------------------------------------------------
  const rows = [
    data.email && { icon: 'mail', text: data.email },
    data.phone && { icon: 'phone', text: data.phone },
    data.location && { icon: 'pin', text: data.location },
    data.website && { icon: 'globe', text: data.website }
  ].filter(Boolean);

  rows.forEach((row) => {
    const y = cursorY;
    const label = `<text x="${textX + (glassy ? 26 : 20)}" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="12" fill="${th.sub}">${esc(row.text)}</text>`;
    const icon = glassy
      ? `<rect x="${textX}" y="${y - 13}" width="17" height="17" rx="4" fill="${th.chip}" stroke="${th.line}"/>${iconPath(row.icon, textX + 3, y - 11, accent, 11)}`
      : iconPath(row.icon, textX, y - 10, accent);
    push(({ index, total }) =>
      wrapPart(`${icon}${label}`, { animationId: anim, progress, index, total, x: textX, y })
    );
    cursorY += glassy ? 19 : 17;
  });

  const total = parts.length;
  const body = parts.map((fn, index) => fn({ index, total })).join('\n');

  let bg;
  if (tpl.pixel) {
    // Beveled "block": thick dark frame, light top-left / dark bottom-right insets.
    bg = `<rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bgGrad)"/>
      <rect x="0" y="0" width="${CARD_WIDTH}" height="4" fill="rgba(255,255,255,0.22)"/>
      <rect x="0" y="0" width="4" height="${CARD_HEIGHT}" fill="rgba(255,255,255,0.22)"/>
      <rect x="0" y="${CARD_HEIGHT - 4}" width="${CARD_WIDTH}" height="4" fill="rgba(0,0,0,0.35)"/>
      <rect x="${CARD_WIDTH - 4}" y="0" width="4" height="${CARD_HEIGHT}" fill="rgba(0,0,0,0.35)"/>
      <rect x="1.5" y="1.5" width="${CARD_WIDTH - 3}" height="${CARD_HEIGHT - 3}" rx="2" fill="none" stroke="${th.line}" stroke-width="3"/>`;
  } else if (tpl.style === 'card') {
    bg = `<rect x="6" y="6" width="${CARD_WIDTH - 12}" height="${CARD_HEIGHT - 12}" rx="10" fill="url(#bgGrad)" stroke="${th.line}" stroke-width="1"/>`;
  } else {
    bg = `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#FFFFFF"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${th.bgFrom}"/>
      <stop offset="1" stop-color="${th.bgTo}"/>
    </linearGradient>
    <filter id="ignite" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${bg}
  ${body}
</svg>`;
}
