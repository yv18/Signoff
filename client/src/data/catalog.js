/** Mirrors server/src/templates/catalog.js. Preview art lives in public/templates. */

export const TEMPLATES = [
  { id: 'beside',  name: 'Beside',  description: 'Photo left, details right.',        preview: '/templates/beside.svg' },
  { id: 'stacked', name: 'Stacked', description: 'Everything in one column.',          preview: '/templates/stacked.svg' },
  { id: 'compact', name: 'Compact', description: 'One tight line for short emails.',   preview: '/templates/compact.svg' },

  { id: 'aurora',  name: 'Aurora',  description: 'Dark card, violet glow.',            preview: '/templates/aurora.svg',
    theme: { bgFrom: '#14112E', bgTo: '#1D1547', fg: '#F4F1FF', sub: '#A9A2D6', line: 'rgba(150,120,255,.3)', accent: '#8B5CF6', chip: 'rgba(139,92,246,.16)', btnText: '#fff' } },
  { id: 'tide',    name: 'Tide',    description: 'Light card, soft blue wash.',        preview: '/templates/tide.svg',
    theme: { bgFrom: '#F2F8FF', bgTo: '#E3EFFC', fg: '#0E2440', sub: '#5C7797', line: 'rgba(59,130,246,.26)', accent: '#2F7FE8', chip: 'rgba(47,127,232,.1)', btnText: '#fff' } },
  { id: 'signal',  name: 'Signal',  description: 'Dark terminal card, logo tile.',     preview: '/templates/signal.svg',
    theme: { bgFrom: '#08150E', bgTo: '#0C2216', fg: '#E9FBF0', sub: '#89B69C', line: 'rgba(52,211,120,.3)', accent: '#34D378', chip: 'rgba(52,211,120,.14)', btnText: '#04200F' } },

  { id: 'glass',    name: 'Glass',      description: 'Frosted violet glass, two-tone name, icon chips.', preview: '/templates/glass.svg', glass: true,
    theme: { bgFrom: '#EEF0FF', bgTo: '#F3EEFF', fg: '#1E1B3A', sub: '#6B6790', line: 'rgba(124,108,255,.28)', accent: '#7C6BFF', chip: 'rgba(255,255,255,.62)', btnText: '#fff' } },
  { id: 'spotlight', name: 'Spotlight', description: 'Dark card, the photo pulses in a ring.', preview: '/templates/spotlight.svg', mediaAnim: true,
    theme: { bgFrom: '#0E0E10', bgTo: '#17171B', fg: '#F5F5F5', sub: '#A0A0A8', line: '#2A2A30', accent: '#FFFFFF', chip: '#1E1E24', btnText: '#000' } },
  { id: 'marvel',   name: 'Marvel',     description: 'Bold red comic-book panel.',     preview: '/templates/marvel.svg',
    theme: { bgFrom: '#1B1B1D', bgTo: '#2A0A0C', fg: '#FFFFFF', sub: '#C9A9AB', line: '#7A1F26', accent: '#E62429', chip: '#3A1416', btnText: '#fff' } },
  { id: 'cricket',  name: 'Cricket',    description: 'India blue with a saffron accent.', preview: '/templates/cricket.svg',
    theme: { bgFrom: '#071C4D', bgTo: '#0A2E7A', fg: '#FFFFFF', sub: '#AEBEE6', line: '#1E469E', accent: '#FF9933', chip: '#12327A', btnText: '#0A1633' } },
  { id: 'football', name: 'Football',   description: 'Pitch green with white lines.',  preview: '/templates/football.svg',
    theme: { bgFrom: '#0B3B1E', bgTo: '#0F5A2E', fg: '#FFFFFF', sub: '#B7D8C2', line: '#1E7A44', accent: '#FFFFFF', chip: '#0E4A26', btnText: '#0B3B1E' } },
  { id: 'gov',      name: 'Government', description: 'Formal navy and gold.',          preview: '/templates/gov.svg',
    theme: { bgFrom: '#0A1F3D', bgTo: '#0E2A52', fg: '#FFFFFF', sub: '#AEBBD0', line: '#22406E', accent: '#F0B429', chip: '#123159', btnText: '#0A1F3D' } },
  { id: 'minecraft', name: 'Minecraft', description: 'Grass-and-dirt block, pixel border, monospace name.', preview: '/templates/minecraft.svg', pixel: true,
    theme: { bgFrom: '#63A233', bgTo: '#75513A', fg: '#FFFFFF', sub: '#E7F0DA', line: '#31491C', accent: '#8BD34B', chip: '#3F6323', btnText: '#17240B' } },
  { id: 'mirra', name: 'Mirra', description: 'Clean card, social rail left, verified name, photo shatters in on the right.',
    preview: '/templates/mirra.svg', mirra: true, socialLeft: true, shardMedia: true,
    theme: { bgFrom: '#FFFFFF', bgTo: '#F4F5F8', fg: '#0E1116', sub: '#6B7280', line: '#E6E7EB', accent: '#1D9BF0', chip: '#F2F3F6', btnText: '#FFFFFF' } }
];

export const ANIMATIONS = [
  { id: 'rise',   name: 'Rise',   description: 'Lines lift into place.' },
  { id: 'fade',   name: 'Focus',  description: 'Blur resolves to sharp.' },
  { id: 'wipe',   name: 'Wipe',   description: 'Revealed left to right.' },
  { id: 'settle', name: 'Settle', description: 'Scales up from the left.' },
  { id: 'glide',  name: 'Glide',  description: 'Slides in from the edge.' },
  { id: 'drop',   name: 'Drop',   description: 'Falls in with a soft bounce.' },
  { id: 'ignite', name: 'Ignite', description: 'Burns in from a flash.' },
  { id: 'unfold', name: 'Unfold', description: 'Hinges down into view.' },
  { id: 'flip',   name: 'Flip',   description: 'Flips in on its edge.' },
  { id: 'zoom',   name: 'Zoom',   description: 'Eases down from large.' },
  { id: 'minecraft', name: 'Minecraft', description: 'Blocks snap into place.' },
  { id: 'shatter', name: 'Shatter', description: 'Pieces drift in and lock together.' }
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
export const isCardTemplate = (id) => Boolean(getTemplate(id).theme);

// Avatar / logo tile shape. `radius` is the CSS/SVG corner value.
export const AVATAR_SHAPES = [
  { id: 'circle', name: 'Circle', radius: '50%' },
  { id: 'rounded', name: 'Rounded', radius: '10px' },
  { id: 'square', name: 'Square', radius: '2px' }
];
export const avatarRadius = (id) =>
  (AVATAR_SHAPES.find((s) => s.id === id) || AVATAR_SHAPES[1]).radius;

export const EMPTY_SIGNATURE = {
  label: 'My signature',
  fullName: '', role: '', company: '', email: '', phone: '',
  website: '', location: '', tagline: '', ctaLabel: '', ctaUrl: '',
  social: { linkedin: '', x: '', instagram: '', youtube: '' },
  assets: { photoUrl: '', logoUrl: '' },
  templateId: 'beside', animationId: 'rise', accent: '#6366F1', avatarShape: 'rounded', verified: false
};

// Vivid options so a signature reads as colourful. Picking any of these now
// colours card templates too, not just the plain ones. (#6366F1 is deliberately
// absent — it is the "untouched" sentinel, so a card template keeps its own
// themed accent until a real colour is chosen here.)
export const ACCENTS = [
  '#2F7FE8', '#06B6D4', '#10B981', '#F0B429',
  '#F97316', '#EF4444', '#EC4899', '#8B5CF6', '#3B4B66', '#0A0A0A'
];
