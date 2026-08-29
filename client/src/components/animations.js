/**
 * On-screen counterparts to the server-side GIF presets. Both read from the
 * same animation ids, so what you preview is what gets rendered.
 *
 * Every preset ends at the resting state and starts near it, because the GIF's
 * first frame is what Outlook on Windows will show and nothing else.
 *
 * Keyframes are declared as plain objects and embedded in the returned style
 * so emotion registers the @keyframes rule — a bare keyframe name string does
 * not get its rule injected.
 */

const FRAMES = {
  rise:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'none' } },
  fade:   { from: { opacity: 0, filter: 'blur(6px)' }, to: { opacity: 1, filter: 'none' } },
  wipe:   { from: { opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-8px)' }, to: { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'none' } },
  settle: { from: { opacity: 0, transform: 'scale(.88)' }, to: { opacity: 1, transform: 'scale(1)' } },
  glide:  { from: { opacity: 0, transform: 'translateX(-26px)' }, to: { opacity: 1, transform: 'none' } },
  drop:   { from: { opacity: 0, transform: 'translateY(-18px) rotate(-2deg)' }, to: { opacity: 1, transform: 'none' } },
  ignite: { '0%': { opacity: 0, filter: 'brightness(2.4)' }, '60%': { opacity: 1 }, '100%': { opacity: 1, filter: 'none' } },
  unfold: { from: { opacity: 0, transform: 'perspective(600px) rotateX(-72deg)' }, to: { opacity: 1, transform: 'none' } },
  // Blocks snapping into place — stepped so it reads chunky, not smooth.
  minecraft: {
    '0%':   { opacity: 0, transform: 'translateY(-14px) scale(.6)' },
    '55%':  { opacity: 1, transform: 'translateY(0) scale(1.08)' },
    '80%':  { transform: 'scale(.96)' },
    '100%': { opacity: 1, transform: 'none' }
  },
  // Pieces drift in and lock together — smooth, no bounce.
  shatter: {
    from: { opacity: 0, transform: 'translateY(10px) scale(.94) rotate(-1.5deg)', filter: 'blur(4px)' },
    to: { opacity: 1, transform: 'none', filter: 'blur(0)' }
  },
  // Flips in on its vertical edge.
  flip: {
    from: { opacity: 0, transform: 'perspective(700px) rotateY(-82deg)' },
    to: { opacity: 1, transform: 'none' }
  },
  // Eases down from slightly oversized.
  zoom: {
    from: { opacity: 0, transform: 'scale(1.22)', filter: 'blur(2px)' },
    to: { opacity: 1, transform: 'none', filter: 'blur(0)' }
  }
};

const TIMING = {
  drop: 'cubic-bezier(.34,1.56,.5,1)',
  minecraft: 'steps(6, end)',
  shatter: 'cubic-bezier(.16,.84,.3,1)',
  flip: 'cubic-bezier(.2,.7,.2,1)',
  zoom: 'cubic-bezier(.2,.8,.25,1)',
  default: 'cubic-bezier(.2,.8,.25,1)'
};

const DURATION = { fade: '0.9s', ignite: '1s', unfold: '0.85s', minecraft: '0.6s', shatter: '0.85s', flip: '0.8s', zoom: '0.75s', default: '0.72s' };

/** sx fragment applied to the signature container. */
export const ANIMATION_CSS = (id = 'rise') => {
  const key = FRAMES[id] ? id : 'rise';
  const name = `sig-${key}`;
  return {
    [`@keyframes ${name}`]: FRAMES[key],
    '& .part': { opacity: 1, transformOrigin: 'left center' },
    '&.run .part': {
      opacity: 0,
      animationName: name,
      animationDuration: DURATION[key] || DURATION.default,
      animationTimingFunction: TIMING[key] || TIMING.default,
      animationFillMode: 'forwards',
      animationDelay: 'calc(var(--i, 0) * 110ms)'
    },
    // Safety net: once the reveal has had time to finish, pin every part (and
    // the photo shards) to their resting state. Keeps the signature readable
    // even if the browser never advanced the CSS animation (reduced motion, a
    // throttled tab, etc.).
    '&.done .part': { opacity: 1, animation: 'none', filter: 'none', clipPath: 'none', transform: 'none' },
    '&.done .shard': { opacity: 1, animation: 'none', transform: 'none' },
    '@media (prefers-reduced-motion: reduce)': {
      '&.run .part': { animation: 'none', opacity: 1 },
      '& .shard': { animation: 'none', opacity: 1, transform: 'none' }
    }
  };
};

/** Small looping demo used on the gallery cards. */
export const DEMO_CSS = (id = 'rise') => {
  const base = ANIMATION_CSS(id);
  return {
    ...base,
    '&.run .part': { ...base['&.run .part'], animationIterationCount: 1 }
  };
};
