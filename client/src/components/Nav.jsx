import { Box, Button, Stack, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { tokens } from '../theme/theme.js';

const Mark = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden>
    <rect x="1.5" y="1.5" width="29" height="29" rx="8" stroke="#000000" strokeWidth="2" />
    <path
      d="M9 20.5c2.6-6.5 4.4-9.8 5.6-9.8 1.5 0 .6 4.6 2 4.6 1.1 0 2.2-2.1 3.4-2.1 1.4 0 1.3 2.4 3 2.4"
      stroke="#000000"
      strokeWidth="2.1"
      strokeLinecap="round"
    />
  </svg>
);

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Box
      component="nav"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        borderBottom: `1px solid ${tokens.edge}`,
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ width: 'min(1180px, calc(100% - 40px))', mx: 'auto', height: 60 }}
      >
        <Stack
          component={Link}
          to="/"
          direction="row"
          alignItems="center"
          spacing={1.1}
          sx={{ textDecoration: 'none', color: 'text.primary' }}
        >
          <Mark />
          <Typography
            sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}
          >
            Signoff
          </Typography>
        </Stack>

        <Box sx={{ flex: 1 }} />

        {user ? (
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Button variant="outlined" onClick={() => navigate('/editor')}>
              Editor
            </Button>
            <Button variant="text" onClick={signOut} sx={{ color: 'text.secondary' }}>
              Sign out
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button variant="text" component={Link} to="/login" sx={{ color: 'text.secondary' }}>
              Sign in
            </Button>
            <Button variant="contained" component={Link} to="/register">
              Get started
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
