import { Box, Typography, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { TEMPLATES } from '../data/catalog.js';
import { tokens } from '../theme/theme.js';

/**
 * Template picker. Each card shows real artwork of the finished signature
 * rather than an abstract swatch, so the choice is made on what it looks like.
 */
export default function TemplateGallery({ value, onChange, columns = 3 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: `repeat(${Math.min(columns, 2)}, 1fr)`,
          md: `repeat(${columns}, 1fr)`
        },
        gap: 1.6
      }}
    >
      {TEMPLATES.map((t) => {
        const selected = value === t.id;
        return (
          <Box
            key={t.id}
            component="button"
            type="button"
            onClick={() => onChange(t.id)}
            sx={{
              p: 0,
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              color: 'inherit',
              background: tokens.glass,
              borderRadius: '10px',
              overflow: 'hidden',
              border: `1px solid ${selected ? '#000000' : tokens.edge}`,
              boxShadow: selected ? '0 0 0 1px #000000' : 'none',
              transition: 'transform .18s ease, border-color .18s ease',
              '&:hover': { transform: 'translateY(-2px)', borderColor: selected ? '#000000' : tokens.edgeHi }
            }}
          >
            <Box sx={{ position: 'relative', aspectRatio: '480 / 220', background: '#F2F2F3' }}>
              <Box
                component="img"
                src={t.preview}
                alt={`${t.name} template`}
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {selected && (
                <CheckCircleIcon
                  sx={{ position: 'absolute', top: 10, right: 10, color: '#000000', fontSize: 22, background: '#fff', borderRadius: '50%' }}
                />
              )}
            </Box>

            <Box sx={{ p: 1.6 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>{t.name}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.3 }}>{t.description}</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
