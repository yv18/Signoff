import sharp from 'sharp';
import { put } from '../services/storage.service.js';

/**
 * Renders the social icons that the email markup links to. Email cannot use
 * inline SVG reliably, so these ship as small PNGs on the static host.
 */
const ICONS = {
  linkedin: 'M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7c.6-1 1.8-2 3.7-2 3 0 4.5 2 4.5 5.4V21h-4v-6c0-1.6-.6-2.6-2-2.6-1.1 0-1.8.8-2.1 1.6V21h-4z',
  x: 'M17.5 3h3l-6.6 7.5L21.8 21h-6l-4.3-5.6L6.4 21H3.3l7-8L2.6 3h6.2l3.9 5.2zM16.3 19.2h1.7L7.8 4.7H6z',
  instagram: 'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.8-.1zm0 3.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8zm0 10.6a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4zm8.1-10.9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
  youtube: 'M21.5 7.2a2.6 2.6 0 0 0-1.8-1.8C18 5 12 5 12 5s-6 0-7.7.4A2.6 2.6 0 0 0 2.5 7.2 27 27 0 0 0 2.1 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C6 19 12 19 12 19s6 0 7.7-.4a2.6 2.6 0 0 0 1.8-1.8 27 27 0 0 0 .4-4.8 27 27 0 0 0-.4-4.8zM10.2 15.1V8.9l5 3.1z'
};

const COLOR = '#5C7797';

async function run() {
  for (const [name, path] of Object.entries(ICONS)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><path d="${path}" fill="${COLOR}"/></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const url = await put(`icons/${name}.png`, png, 'image/png');
    console.log('wrote', url);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
