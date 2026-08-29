import { CARD_WIDTH, CARD_HEIGHT } from './cardSvg.js';

/**
 * The markup that actually goes into Gmail or Outlook.
 *
 * Rules that are not negotiable in email:
 *   - tables for layout, no flexbox or grid
 *   - inline styles only, no <style> block and no classes
 *   - absolute image URLs on a public host, no data URIs (Gmail strips them,
 *     and Gmail fetches every image through its own proxy, so the host has to
 *     be reachable from the public internet — not localhost)
 *   - explicit width and height on every image, at the asset's real aspect ratio
 *
 * The rendered GIF already contains the photo/logo, name, role, tagline and
 * contact rows as a finished, readable card. So the email is that image at its
 * true size, followed by the one thing the GIF does not carry — the social
 * icons — kept as live HTML so their links still work.
 */

const esc = (s = '') =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const href = (u) => {
  const v = String(u || '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

// Display the card a little smaller than it is rendered (retina-ish) but at
// its exact aspect ratio, so it never looks squashed.
const DISPLAY_WIDTH = 468;
const DISPLAY_HEIGHT = Math.round((CARD_HEIGHT / CARD_WIDTH) * DISPLAY_WIDTH);

export function buildEmailHtml(signature, { assetUrl, iconBase }) {
  const blocks = [
    `<tr><td style="padding:0;">
      <img src="${esc(assetUrl)}" width="${DISPLAY_WIDTH}" height="${DISPLAY_HEIGHT}" alt="${esc(signature.fullName || 'Email signature')}" style="display:block;border:0;outline:none;text-decoration:none;width:${DISPLAY_WIDTH}px;height:${DISPLAY_HEIGHT}px;max-width:100%;">
    </td></tr>`
  ];

  const socials = ['linkedin', 'x', 'instagram', 'youtube']
    .filter((k) => signature.social?.[k])
    .map(
      (k) =>
        `<a href="${esc(href(signature.social[k]))}" style="text-decoration:none;display:inline-block;margin-right:8px;"><img src="${esc(iconBase)}/${k}.png" width="18" height="18" alt="${k}" style="border:0;display:block;"></a>`
    );

  if (socials.length) {
    blocks.push(`<tr><td style="padding:10px 0 0;">${socials.join('')}</td></tr>`);
  }

  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">
  ${blocks.join('\n  ')}
</table>`;
}
