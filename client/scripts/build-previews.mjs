/**
 * Generates the template preview images shown in the gallery.
 *
 * These are committed to public/templates so the gallery has real artwork on
 * first load, with no API call and no external image host. Re-run with
 * `npm run previews` after changing a template theme.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../public/templates');

const W = 480;
const H = 220;

const THEMES = {
  beside:  { bgFrom: '#FFFFFF', bgTo: '#FFFFFF', fg: '#141414', sub: '#6A6A76', line: '#E4E4EC', accent: '#111111', chip: '#F2F2F3', media: 'circle', plain: true },
  stacked: { bgFrom: '#FFFFFF', bgTo: '#FFFFFF', fg: '#141414', sub: '#6A6A76', line: '#E4E4EC', accent: '#111111', chip: '#F2F2F3', media: 'circle', plain: true, stack: true },
  compact: { bgFrom: '#FFFFFF', bgTo: '#FFFFFF', fg: '#141414', sub: '#6A6A76', line: '#E4E4EC', accent: '#111111', chip: '#F2F2F3', media: 'circle', plain: true, compact: true },

  aurora:  { bgFrom: '#14112E', bgTo: '#1D1547', fg: '#F4F1FF', sub: '#A9A2D6', line: '#5B3FA8', accent: '#8B5CF6', chip: '#2A1F52', media: 'circle' },
  tide:    { bgFrom: '#F2F8FF', bgTo: '#E3EFFC', fg: '#0E2440', sub: '#5C7797', line: '#BBD6F4', accent: '#2F7FE8', chip: '#DCEBFB', media: 'circle' },
  signal:  { bgFrom: '#08150E', bgTo: '#0C2216', fg: '#E9FBF0', sub: '#89B69C', line: '#1F5C39', accent: '#34D378', chip: '#11331F', media: 'tile' },

  glass:    { bgFrom: '#EEF0FF', bgTo: '#F3EEFF', fg: '#1E1B3A', sub: '#6B6790', line: '#D9D2FF', accent: '#7C6BFF', chip: '#F4F1FF', media: 'circle', glass: true },
  spotlight:{ bgFrom: '#0E0E10', bgTo: '#17171B', fg: '#F5F5F5', sub: '#A0A0A8', line: '#2A2A30', accent: '#FFFFFF', chip: '#1E1E24', media: 'tile', btnText: '#000000' },
  marvel:   { bgFrom: '#1B1B1D', bgTo: '#2A0A0C', fg: '#FFFFFF', sub: '#C9A9AB', line: '#7A1F26', accent: '#E62429', chip: '#3A1416', media: 'circle' },
  cricket:  { bgFrom: '#071C4D', bgTo: '#0A2E7A', fg: '#FFFFFF', sub: '#AEBEE6', line: '#1E469E', accent: '#FF9933', chip: '#12327A', media: 'circle', btnText: '#0A1633' },
  football: { bgFrom: '#0B3B1E', bgTo: '#0F5A2E', fg: '#FFFFFF', sub: '#B7D8C2', line: '#1E7A44', accent: '#FFFFFF', chip: '#0E4A26', media: 'circle', btnText: '#0B3B1E' },
  gov:      { bgFrom: '#0A1F3D', bgTo: '#0E2A52', fg: '#FFFFFF', sub: '#AEBBD0', line: '#22406E', accent: '#C9A227', chip: '#123159', media: 'circle', btnText: '#0A1F3D' },
  minecraft:{ bgFrom: '#63A233', bgTo: '#75513A', fg: '#FFFFFF', sub: '#E7F0DA', line: '#31491C', accent: '#8BD34B', chip: '#3F6323', media: 'circle', pixel: true, btnText: '#17240B' },
  mirra:    { bgFrom: '#FFFFFF', bgTo: '#F4F5F8', fg: '#0E1116', sub: '#6B7280', line: '#E6E7EB', accent: '#1D9BF0', chip: '#F2F3F6', media: 'circle', mirra: true }
};

const NAME = 'Example Data';
const ROLE = 'Product Manager';
const TAG = 'Building better products, together.';
const ROWS = ['example.data@example.com', '+1 (555) 012-3456', 'San Francisco, CA, USA'];

const ICON = {
  mail: 'M2 4h12v8H2z M2 5l6 4 6-4',
  phone: 'M3 2h2.6l1.3 3.2-1.6 1a8 8 0 0 0 4 4l1-1.6L13.5 10v2.6a1.3 1.3 0 0 1-1.4 1.3A11.3 11.3 0 0 1 2 3.4 1.3 1.3 0 0 1 3 2z',
  pin: 'M8 14s4.5-3.7 4.5-7.2A4.5 4.5 0 0 0 3.5 6.8C3.5 10.3 8 14 8 14z'
};
const ORDER = ['mail', 'phone', 'pin'];

/** A generic portrait, drawn rather than photographed so nothing is licensed. */
function portrait(cx, cy, r, t) {
  return `<g>
    <clipPath id="pclip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <g clip-path="url(#pclip)">
      <rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${t.chip}"/>
      <circle cx="${cx}" cy="${cy - r * 0.18}" r="${r * 0.36}" fill="${t.accent}" opacity="0.85"/>
      <path d="M ${cx - r} ${cy + r} a ${r * 0.72} ${r * 0.62} 0 0 1 ${r * 2} 0 z" fill="${t.accent}" opacity="0.55"/>
    </g>
    <circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="${t.accent}" stroke-width="1" opacity="0.35"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.accent}" stroke-width="2"/>
    <path d="M ${cx} ${cy - r - 4} a ${r + 4} ${r + 4} 0 0 1 ${r + 4} ${r + 4}" fill="none" stroke="${t.accent}" stroke-width="2.5" stroke-linecap="round"/>
  </g>`;
}

function tile(x, y, size, t) {
  return `<g>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="10" fill="${t.chip}" stroke="${t.accent}" stroke-width="1.5"/>
    <text x="${x + size / 2}" y="${y + size / 2 + 9}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="24" font-weight="700" fill="${t.accent}">ED</text>
  </g>`;
}

function rail(t, x, y) {
  return ORDER.map((k, i) => `
    <g transform="translate(${x} ${y + i * 40})">
      <rect width="32" height="32" rx="10" fill="${t.chip}" stroke="${t.line}"/>
      <g transform="translate(8 8)" fill="none" stroke="${t.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="${ICON[k]}"/>
      </g>
    </g>`).join('');
}

const svgWrap = (inner, t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bgFrom}"/><stop offset="1" stop-color="${t.bgTo}"/>
    </linearGradient>
  </defs>
  ${inner}
</svg>`;

/** Mirra: social rail left · verified name · shard photo right. */
function buildMirra(t) {
  const tickX = 78 + NAME.length * 11.3 + 16;
  const railIcons = ['mail', 'phone', 'pin']
    .map((k, i) => `<g transform="translate(24 ${64 + i * 40})">
      <rect width="30" height="30" rx="8" fill="${t.chip}" stroke="${t.line}"/>
      <g transform="translate(7.5 7.5)" fill="none" stroke="${t.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[k]}"/></g>
    </g>`).join('');
  const rows = ROWS.slice(0, 3).map((r, i) => `<g transform="translate(78 ${132 + i * 22})">
      <rect x="0" y="-13" width="16" height="16" rx="4" fill="${t.chip}" stroke="${t.line}"/>
      <g transform="translate(3 -11) scale(0.62)" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[ORDER[i]]}"/></g>
      <text x="24" y="0" font-family="Helvetica,Arial,sans-serif" font-size="11.5" fill="${t.sub}">${r}</text>
    </g>`).join('');
  const px = W - 26 - 100;
  const py = 34;
  // Assembled portrait with two faint fracture lines — a nod to the shatter
  // reveal without looking like a broken render.
  const photo = `<clipPath id="mrect"><rect x="${px}" y="${py}" width="100" height="100" rx="10"/></clipPath>
    <g clip-path="url(#mrect)">
      <rect x="${px}" y="${py}" width="100" height="100" fill="${t.chip}"/>
      <circle cx="${px + 50}" cy="${py + 44}" r="20" fill="${t.accent}" opacity="0.85"/>
      <path d="M ${px + 16} ${py + 100} a 34 27 0 0 1 68 0 z" fill="${t.accent}" opacity="0.6"/>
      <path d="M ${px + 36} ${py} L ${px + 12} ${py + 100}" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"/>
      <path d="M ${px + 74} ${py} L ${px + 50} ${py + 100}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
    </g>
    <rect x="${px}" y="${py}" width="100" height="100" rx="10" fill="none" stroke="${t.line}"/>
    <rect x="${px + 74}" y="${py + 110}" width="12" height="12" rx="2" fill="${t.accent}"/>
    <rect x="${px + 90}" y="${py + 112}" width="9" height="9" rx="2" fill="${t.sub}" opacity="0.45"/>`;

  const inner = `
    <rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="10" fill="url(#bg)" stroke="${t.line}"/>
    ${railIcons}
    <line x1="64" y1="40" x2="64" y2="${H - 40}" stroke="${t.line}"/>
    <text x="78" y="46" font-family="Helvetica,Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="3" fill="${t.sub}">MIRRA</text>
    <text x="78" y="76" font-family="Helvetica,Arial,sans-serif" font-size="20" font-weight="700" fill="${t.fg}">${NAME}</text>
    <g transform="translate(${tickX} 70)"><circle r="7" fill="#1D9BF0"/><path d="M -3 0 L -0.6 2.5 L 3.5 -2.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>
    <text x="78" y="94" font-family="Helvetica,Arial,sans-serif" font-size="12" font-weight="600" fill="${t.accent}">${ROLE}</text>
    <line x1="78" y1="106" x2="300" y2="106" stroke="${t.line}"/>
    ${rows}
    ${photo}
  `;
  return svgWrap(inner, t);
}

function build(id) {
  const t = THEMES[id];
  if (t.mirra) return buildMirra(t);
  const mediaSize = 72;
  const mx = t.stack ? 26 : 26;
  const my = t.stack ? 26 : 44;
  const tx = t.stack ? 26 : mx + mediaSize + 20;
  let y = t.stack ? my + mediaSize + 28 : 58;

  const media = t.media === 'tile'
    ? tile(mx, my, mediaSize, t)
    : portrait(mx + mediaSize / 2, my + mediaSize / 2, mediaSize / 2, t);

  const rows = t.compact ? [] : ROWS;

  const [firstName, ...restName] = NAME.split(' ');
  const lastName = restName.join(' ');
  let nameEl;
  if (t.glass) {
    nameEl = `<text x="${tx}" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="21" font-weight="700" fill="${t.fg}">${firstName} <tspan fill="${t.accent}">${lastName}</tspan></text>
       <rect x="${tx}" y="${y + 7}" width="52" height="3" rx="1.5" fill="${t.accent}"/>
       <text x="${tx}" y="${y + 25}" font-family="Helvetica,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="2.4" fill="${t.accent}">${ROLE.toUpperCase()}</text>`;
  } else if (t.pixel) {
    nameEl = `<text x="${tx + 2}" y="${y + 2}" font-family="monospace" font-size="18" font-weight="700" fill="rgba(0,0,0,0.35)">${NAME}</text>
       <text x="${tx}" y="${y}" font-family="monospace" font-size="18" font-weight="700" fill="${t.fg}">${NAME}</text>
       <text x="${tx}" y="${y + 18}" font-family="monospace" font-size="11" font-weight="700" fill="${t.accent}">${ROLE}</text>`;
  } else {
    nameEl = `<text x="${tx}" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="19" font-weight="700" fill="${t.fg}">${NAME}</text>
       <text x="${tx}" y="${y + 18}" font-family="Helvetica,Arial,sans-serif" font-size="12" font-weight="600" fill="${t.accent}">${ROLE}</text>
       <rect x="${tx}" y="${y + 28}" width="200" height="1" fill="${t.accent}" opacity="0.4"/>`;
  }

  const body = `
    ${nameEl}
    ${t.compact ? '' : `<text x="${tx}" y="${y + 46}" font-family="Helvetica,Arial,sans-serif" font-size="11" fill="${t.sub}">${TAG}</text>`}
    ${rows.map((r, i) => `
      <g transform="translate(${tx} ${y + 60 + i * 19})">
        <g fill="none" stroke="${t.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -9) scale(0.8)">
          <path d="${ICON[ORDER[i]]}"/>
        </g>
        <text x="20" y="0" font-family="Helvetica,Arial,sans-serif" font-size="11.5" fill="${t.sub}">${r}</text>
      </g>`).join('')}
  `;

  const dots = t.glass
    ? `<g fill="${t.accent}" opacity="0.35">${[0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3, 4, 5].map((c) => `<circle cx="${18 + c * 7}" cy="${18 + r * 7}" r="1"/>`)).join('')}</g>`
    : '';

  const railEl = t.plain ? '' : rail(t, W - 62, 52);

  const frame = t.pixel
    ? `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)"/>
       <rect x="0" y="0" width="${W}" height="6" fill="rgba(255,255,255,0.22)"/>
       <rect x="0" y="0" width="6" height="${H}" fill="rgba(255,255,255,0.22)"/>
       <rect x="0" y="${H - 6}" width="${W}" height="6" fill="rgba(0,0,0,0.35)"/>
       <rect x="${W - 6}" y="0" width="6" height="${H}" fill="rgba(0,0,0,0.35)"/>
       <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="2" fill="none" stroke="${t.line}" stroke-width="4"/>`
    : `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="10" fill="url(#bg)" stroke="${t.line}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bgFrom}"/>
      <stop offset="1" stop-color="${t.bgTo}"/>
    </linearGradient>
  </defs>
  ${frame}
  ${dots}
  ${media}
  ${body}
  ${railEl}
</svg>`;
}

await fs.mkdir(OUT, { recursive: true });
for (const id of Object.keys(THEMES)) {
  await fs.writeFile(path.join(OUT, `${id}.svg`), build(id), 'utf8');
  console.log('wrote', path.join('public/templates', `${id}.svg`));
}
