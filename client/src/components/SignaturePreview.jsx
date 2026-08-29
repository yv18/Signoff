import { useEffect, useRef } from 'react';
import { Box, Stack, Typography, Avatar } from '@mui/material';
import { keyframes } from '@emotion/react';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import { getTemplate, isCardTemplate, avatarRadius } from '../data/catalog.js';
import { ANIMATION_CSS } from './animations.js';

const SOCIAL_ICON = { linkedin: LinkedInIcon, x: CloseIcon, instagram: InstagramIcon, youtube: YouTubeIcon };

const pulse = keyframes`
  0%   { opacity: .55; transform: scale(1); }
  70%  { opacity: 0;   transform: scale(1.35); }
  100% { opacity: 0;   transform: scale(1.35); }
`;

// Each shard drifts in from its own offset (set per-element via CSS vars) and
// locks to identity. No scale at rest — every shard shares the same
// background-size/position, so the overlapping clip regions are seamless.
const assemble = keyframes`
  from { opacity: 0; transform: translate(var(--tx, 0), var(--ty, 0)) rotate(var(--rot, 0)); }
  to   { opacity: 1; transform: none; }
`;

// Angled strips that overlap their neighbours by ~2% so no hairline shows.
const SHARDS = [
  { clip: 'polygon(0% 0%, 22% 0%, 2% 100%, 0% 100%)', tx: '-16px', ty: '10px', rot: '-6deg' },
  { clip: 'polygon(18% 0%, 42% 0%, 22% 100%, -2% 100%)', tx: '13px', ty: '-14px', rot: '5deg' },
  { clip: 'polygon(38% 0%, 62% 0%, 42% 100%, 18% 100%)', tx: '-10px', ty: '16px', rot: '-4deg' },
  { clip: 'polygon(58% 0%, 82% 0%, 62% 100%, 38% 100%)', tx: '14px', ty: '12px', rot: '6deg' },
  { clip: 'polygon(78% 0%, 102% 0%, 82% 100%, 58% 100%)', tx: '-14px', ty: '-12px', rot: '-5deg' },
  { clip: 'polygon(100% 0%, 102% 0%, 102% 100%, 78% 100%)', tx: '10px', ty: '14px', rot: '4deg' }
];

const initials = (n = '') =>
  n.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || 'S';

const href = (u) => (/^https?:\/\//i.test(u || '') ? u : `https://${u}`);

/**
 * Staggered reveal wrapper. Defined at module scope (a stable component type)
 * so re-renders update it in place instead of remounting and restarting the
 * animation from zero.
 */
function Part({ i, children }) {
  return (
    <Box className="part" style={{ '--i': i }}>
      {children}
    </Box>
  );
}

/** A small blue verified badge, sized to sit on the name baseline. */
function VerifiedTick({ size = 16 }) {
  return (
    <VerifiedIcon
      aria-label="Verified"
      sx={{ fontSize: size, color: '#1D9BF0', ml: 0.5, verticalAlign: 'middle', flexShrink: 0 }}
    />
  );
}

/** Photo that shatters into angled pieces and reassembles. `key`ed on replayKey. */
function ShardMedia({ src, size, radius, ring }) {
  return (
    <Box sx={{ position: 'relative', width: size, height: size, borderRadius: radius, overflow: 'hidden', border: `1px solid ${ring}` }}>
      {SHARDS.map((s, idx) => (
        <Box
          key={idx}
          className="shard"
          style={{ '--tx': s.tx, '--ty': s.ty, '--rot': s.rot, animationDelay: `${idx * 65}ms` }}
          sx={{
            position: 'absolute',
            inset: 0,
            clipPath: s.clip,
            backgroundImage: `url("${src}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: `${assemble} 0.7s cubic-bezier(.16,.84,.3,1) both`
          }}
        />
      ))}
    </Box>
  );
}

/**
 * On-screen preview. A faithful stand-in for the rendered GIF — the server
 * produces the shipped artefact from the same field values.
 */
export default function SignaturePreview({ data, replayKey = 0 }) {
  const ref = useRef(null);
  const tpl = getTemplate(data.templateId);
  const card = isCardTemplate(data.templateId);
  const th = tpl.theme;
  const accent = card ? th.accent : data.accent;
  const glassy = Boolean(tpl.glass);
  const pixel = Boolean(tpl.pixel);
  const mirra = Boolean(tpl.mirra);
  const mediaAnim = Boolean(tpl.mediaAnim);
  const mediaRadius = avatarRadius(data.avatarShape);
  const verified = Boolean(data.verified);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('run', 'done');
    void el.offsetWidth;
    el.classList.add('run');
    const settle = setTimeout(() => el.classList.add('done'), 2400);
    return () => clearTimeout(settle);
  }, [replayKey, data.templateId, data.animationId, data.fullName, data.role, data.company, data.avatarShape, data.verified]);

  const hasContent = data.fullName || data.role || data.email || data.assets?.photoUrl;
  if (!hasContent) {
    return (
      <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'text.disabled', py: 4 }}>
        Fill in your details and the signature builds itself.
      </Typography>
    );
  }

  const rows = [
    data.email && { Icon: MailOutlineIcon, text: data.email, link: `mailto:${data.email}` },
    data.phone && { Icon: PhoneIphoneIcon, text: data.phone, link: `tel:${data.phone.replace(/\s/g, '')}` },
    data.location && { Icon: PlaceOutlinedIcon, text: data.location },
    data.website && { Icon: LanguageIcon, text: data.website, link: href(data.website) }
  ].filter(Boolean);

  const socials = Object.entries(data.social || {}).filter(([, v]) => v);

  let i = 0;

  const hasLogo = Boolean(data.assets?.logoUrl);
  const hasPhoto = Boolean(data.assets?.photoUrl);

  const mediaFill = hasLogo
    ? '#FFFFFF'
    : glassy
      ? 'rgba(255,255,255,0.94)'
      : card
        ? th.chip
        : '#F2F2F3';

  const mediaBox = {
    width: 76,
    height: 76,
    borderRadius: mediaRadius,
    display: 'grid',
    placeItems: 'center',
    background: mediaFill,
    border: `1px solid ${accent}`,
    overflow: 'hidden'
  };

  const mediaInner = hasLogo ? (
    <Box sx={{ ...mediaBox, p: '7px' }}>
      <Box component="img" src={data.assets.logoUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    </Box>
  ) : hasPhoto ? (
    <Avatar src={data.assets.photoUrl} sx={{ width: 76, height: 76, borderRadius: mediaRadius, border: `2px solid ${accent}` }} />
  ) : (
    <Box sx={{ ...mediaBox, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 25, color: accent }}>
      {initials(data.fullName)}
    </Box>
  );

  const media = mediaAnim ? (
    <Box sx={{ position: 'relative', width: 76, height: 76 }}>
      {[0, 1].map((n) => (
        <Box
          key={n}
          sx={{
            position: 'absolute', inset: 0, borderRadius: mediaRadius,
            border: `2px solid ${accent}`,
            animation: `${pulse} 2.6s ease-out infinite`,
            animationDelay: `${n * 1.3}s`
          }}
        />
      ))}
      <Box sx={{ position: 'absolute', inset: 0 }}>{mediaInner}</Box>
    </Box>
  ) : mediaInner;

  const nameWithTick = (node) => (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
      {node}
      {verified && <VerifiedTick size={mirra ? 17 : 15} />}
    </Box>
  );

  // Name element (per-template styling), verified tick appended.
  const nameEl = data.fullName && (() => {
    if (glassy) {
      const words = data.fullName.trim().split(/\s+/);
      const last = words.length > 1 ? words.pop() : null;
      return (
        <Box>
          {nameWithTick(
            <Typography component="span" sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: th.fg }}>
              {words.join(' ')}{last ? ' ' : ''}
              {last && <Box component="span" sx={{ color: accent }}>{last}</Box>}
            </Typography>
          )}
          <Box sx={{ width: 52, height: 3, borderRadius: '2px', mt: 0.6, background: `linear-gradient(90deg, ${accent}, ${th.sub})` }} />
        </Box>
      );
    }
    return nameWithTick(
      <Typography component="span" sx={{
        fontFamily: pixel ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700, fontSize: pixel ? 17 : mirra ? 20 : 19, letterSpacing: pixel ? 0 : '-0.02em',
        color: card ? th.fg : 'text.primary',
        textShadow: pixel ? '2px 2px 0 rgba(0,0,0,.35)' : 'none'
      }}>
        {data.fullName}
      </Typography>
    );
  })();

  const ContactRow = ({ Icon, text, link }) => (
    <Stack
      direction="row"
      spacing={1.1}
      alignItems="center"
      component={link ? 'a' : 'div'}
      href={link}
      sx={{ textDecoration: 'none', color: card ? th.sub : 'text.secondary', fontSize: 12, width: 'fit-content' }}
    >
      {glassy || mirra ? (
        <Box sx={{ width: 22, height: 22, borderRadius: '6px', flexShrink: 0, background: th.chip, border: `1px solid ${th.line}`, display: 'grid', placeItems: 'center' }}>
          <Icon sx={{ fontSize: 13, color: accent }} />
        </Box>
      ) : (
        <Icon sx={{ fontSize: 14, color: accent }} />
      )}
      <span>{text}</span>
    </Stack>
  );

  const SocialRail = ({ vertical }) => (
    <Stack
      direction={vertical ? 'column' : { xs: 'row', sm: 'column' }}
      spacing={0.9}
      justifyContent="center"
      alignItems="center"
    >
      {socials.slice(0, 5).map(([k, v]) => {
        const Icon = SOCIAL_ICON[k];
        return (
          <Box
            key={k}
            component="a"
            href={href(v)}
            aria-label={k}
            sx={{
              width: 30, height: 30, borderRadius: '8px', display: 'grid', placeItems: 'center',
              background: mirra ? th.chip : glassy ? 'rgba(255,255,255,.75)' : th.chip,
              border: `1px solid ${th.line}`, color: accent, textDecoration: 'none',
              transition: '.2s', '&:hover': { background: accent, color: th.btnText }
            }}
          >
            <Icon sx={{ fontSize: 15 }} />
          </Box>
        );
      })}
    </Stack>
  );

  // ---------- Mirra: social rail left · details · shattering photo right ----------
  if (mirra) {
    return (
      <Box
        ref={ref}
        sx={{
          ...ANIMATION_CSS(data.animationId),
          display: 'flex',
          alignItems: 'stretch',
          gap: { xs: 1.4, sm: 2 },
          maxWidth: 560,
          width: '100%',
          p: { xs: 1.8, sm: 2.4 },
          borderRadius: '10px',
          color: th.fg,
          background: `linear-gradient(140deg, ${th.bgFrom}, ${th.bgTo})`,
          border: `1px solid ${th.line}`,
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}
      >
        {socials.length > 0 && (
          <Part i={i++}>
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', pr: { sm: 1 }, borderRight: { sm: `1px solid ${th.line}` } }}>
              <SocialRail vertical />
            </Box>
          </Part>
        )}

        <Box sx={{ minWidth: 0, flex: '1 1 200px' }}>
          {data.company && (
            <Part i={i++}>
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.6 }}>
                {hasLogo && (
                  <Box component="img" src={data.assets.logoUrl} alt="" sx={{ height: 16, maxWidth: 90, objectFit: 'contain', display: 'block' }} />
                )}
                <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: th.sub }}>
                  {data.company}
                </Typography>
              </Stack>
            </Part>
          )}

          {nameEl && <Part i={i++}>{nameEl}</Part>}

          {data.role && (
            <Part i={i++}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: accent, mt: 0.2 }}>{data.role}</Typography>
            </Part>
          )}

          <Part i={i++}>
            <Box sx={{ height: '1px', background: th.line, my: 1.1 }} />
          </Part>

          {data.tagline && (
            <Part i={i++}>
              <Typography sx={{ fontSize: 11.5, color: th.sub, lineHeight: 1.5, mb: 1 }}>{data.tagline}</Typography>
            </Part>
          )}

          {rows.length > 0 && (
            <Part i={i++}>
              <Stack spacing={0.8}>{rows.map((r) => <ContactRow key={r.text} {...r} />)}</Stack>
            </Part>
          )}
        </Box>

        <Part i={i++}>
          {hasPhoto ? (
            <ShardMedia key={replayKey} src={data.assets.photoUrl} size={96} radius="10px" ring={th.line} />
          ) : (
            <Box sx={{
              width: 96, height: 96, borderRadius: '10px', border: `1px solid ${th.line}`,
              background: hasLogo ? '#fff' : th.chip, display: 'grid', placeItems: 'center', overflow: 'hidden'
            }}>
              {hasLogo ? (
                <Box component="img" src={data.assets.logoUrl} alt="" sx={{ width: '82%', height: '82%', objectFit: 'contain' }} />
              ) : (
                <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 30, color: accent }}>
                  {initials(data.fullName)}
                </Typography>
              )}
            </Box>
          )}
        </Part>
      </Box>
    );
  }

  // ---------- default / glass / pixel / spotlight layout ----------
  return (
    <Box
      ref={ref}
      sx={{
        ...ANIMATION_CSS(data.animationId),
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        gap: { xs: 1.5, sm: 2 },
        maxWidth: 560,
        width: '100%',
        p: card ? { xs: 1.8, sm: 2.5 } : 0,
        borderRadius: card ? (pixel ? '2px' : '10px') : 0,
        color: card ? th.fg : 'text.primary',
        ...(pixel && {
          background: `linear-gradient(140deg, ${th.bgFrom}, ${th.bgTo})`,
          border: `3px solid ${th.line}`,
          boxShadow: 'inset 3px 3px 0 rgba(255,255,255,.20), inset -3px -3px 0 rgba(0,0,0,.35)'
        }),
        ...(card && !glassy && !pixel && {
          background: `linear-gradient(140deg, ${th.bgFrom}, ${th.bgTo})`,
          border: `1px solid ${th.line}`
        }),
        ...(glassy && {
          background: `linear-gradient(140deg, rgba(233,238,246,.85), rgba(240,235,248,.6))`,
          border: `1px solid rgba(255,255,255,.8)`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 24px 48px -28px rgba(60,50,120,.4)',
          overflow: 'hidden'
        })
      }}
    >
      {glassy && (
        <Box aria-hidden sx={{
          position: 'absolute', top: 9, left: 9, width: 40, height: 16, opacity: 0.35, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `radial-gradient(circle, ${accent} 1px, transparent 1px)`,
          backgroundSize: '7px 7px'
        }} />
      )}

      <Stack direction="row" spacing={{ xs: 1.6, sm: 2.2 }} sx={{ position: 'relative', zIndex: 1, flex: '1 1 260px', minWidth: 0 }}>
        <Part i={i++}>{media}</Part>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          {nameEl && <Part i={i++}>{nameEl}</Part>}

          {(data.role || data.company) && (
            <Part i={i++}>
              <Typography
                sx={
                  glassy
                    ? { fontSize: 11, fontWeight: 700, color: accent, mt: 0.9, textTransform: 'uppercase', letterSpacing: '0.18em' }
                    : { fontSize: 12.5, fontWeight: 600, color: accent, mt: 0.3 }
                }
              >
                {[data.role, data.company].filter(Boolean).map((v, idx) => (
                  <Box component="span" key={v}>
                    {idx > 0 && <Box component="span" sx={{ color: card ? th.sub : 'text.secondary', fontWeight: 400, mx: 0.9, opacity: 0.6 }}>|</Box>}
                    {v}
                  </Box>
                ))}
              </Typography>
            </Part>
          )}

          {!glassy && (
            <Part i={i++}>
              <Box sx={{ height: '1px', background: `linear-gradient(90deg, ${accent}, transparent)`, opacity: 0.5, my: 1.2 }} />
            </Part>
          )}

          {data.tagline && (
            <Part i={i++}>
              <Typography sx={{ fontSize: 11.5, color: card ? th.sub : 'text.secondary', lineHeight: 1.5, mt: glassy ? 1 : 0 }}>
                {data.tagline}
              </Typography>
            </Part>
          )}

          {glassy && (
            <Part i={i++}>
              <Box sx={{ height: '1px', background: th.line, my: 1.3 }} />
            </Part>
          )}

          {rows.length > 0 && (
            <Part i={i++}>
              <Stack spacing={glassy ? 0.9 : 0.6} sx={{ mt: glassy ? 0 : 1.2 }}>
                {rows.map((r) => <ContactRow key={r.text} {...r} />)}
              </Stack>
            </Part>
          )}
        </Box>
      </Stack>

      {card && socials.length > 0 && (
        <Part i={i++}>
          <Box
            sx={{
              position: 'relative', zIndex: 1,
              ...(glassy && { p: 0.8, borderRadius: '10px', background: th.chip, border: `1px solid ${th.line}` }),
              height: '100%'
            }}
          >
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', pl: { xs: 0, sm: glassy ? 0 : 2 }, pt: { xs: 1, sm: 0 } }}>
              <SocialRail />
            </Box>
          </Box>
        </Part>
      )}
    </Box>
  );
}
