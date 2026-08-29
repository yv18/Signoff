import { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { ANIMATIONS } from '../data/catalog.js';
import { DEMO_CSS } from './animations.js';
import { tokens } from '../theme/theme.js';

/** Each card plays its own animation on hover, so the name is never the only clue. */
function DemoCard({ anim, selected, onClick }) {
  const ref = useRef(null);

  const play = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('run');
    void el.offsetWidth;
    el.classList.add('run');
  };

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      onMouseEnter={play}
      onFocus={play}
      sx={{
        p: 1.8,
        textAlign: 'left',
        cursor: 'pointer',
        font: 'inherit',
        color: 'inherit',
        background: selected ? '#F2F2F3' : tokens.glass,
        borderRadius: '10px',
        border: `1px solid ${selected ? '#000000' : tokens.edge}`,
        transition: 'transform .18s ease, border-color .18s ease',
        '&:hover': { transform: 'translateY(-2px)', borderColor: selected ? '#000000' : tokens.edgeHi }
      }}
    >
      <Box ref={ref} sx={{ ...DEMO_CSS(anim.id), height: 52, display: 'flex', alignItems: 'center', gap: 0.9, mb: 1.4 }}>
        <Box className="part" style={{ '--i': 0 }} sx={{ width: 52, height: 8, borderRadius: '2px', background: '#000000' }} />
        <Box className="part" style={{ '--i': 1 }} sx={{ width: 34, height: 8, borderRadius: '2px', background: '#000000', opacity: 0.55 }} />
        <Box className="part" style={{ '--i': 2 }} sx={{ width: 20, height: 8, borderRadius: '2px', background: '#000000', opacity: 0.3 }} />
      </Box>

      <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>{anim.name}</Typography>
      <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.3 }}>{anim.description}</Typography>
    </Box>
  );
}

export default function AnimationGallery({ value, onChange, columns = 4 }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${columns}, 1fr)` }, gap: 1.4 }}>
      {ANIMATIONS.map((a) => (
        <DemoCard key={a.id} anim={a} selected={value === a.id} onClick={() => onChange(a.id)} />
      ))}
    </Box>
  );
}
