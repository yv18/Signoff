import { Box } from '@mui/material';

/**
 * Background treatment. A near-white page with a faint grid, kept very low
 * contrast so the panels are the focus. Static.
 */
export default function Aurora() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#F6F6F7'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.6,
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, #000 10%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, #000 10%, transparent 70%)'
        }}
      />
    </Box>
  );
}
