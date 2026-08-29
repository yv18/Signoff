import { Box, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { tokens } from '../theme/theme.js';

const links = [
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
  ['Cookies', '/cookies']
];

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: `1px solid ${tokens.edge}`,
        mt: 8,
        py: 4
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ width: 'min(1180px, calc(100% - 40px))', mx: 'auto', color: 'text.disabled' }}
      >
        <Typography sx={{ fontSize: 13 }}>© {new Date().getFullYear()} Signoff — animated email signatures</Typography>
        <Stack direction="row" spacing={2.5}>
          {links.map(([label, to]) => (
            <Box
              key={to}
              component={Link}
              to={to}
              sx={{ fontSize: 13, color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'text.primary' } }}
            >
              {label}
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
