import { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { tokens } from '../theme/theme.js';

const KEY = 'sg_cookie_ack';

/**
 * Disclosure banner. Signoff only sets one strictly-necessary cookie (the
 * httpOnly session cookie) and uses no analytics or advertising trackers, so
 * this informs rather than asks for consent it doesn't need. The choice is
 * remembered per-browser in localStorage.
 */
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* private mode — just close it */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <Box
      role="region"
      aria-label="Cookie notice"
      sx={{
        position: 'fixed',
        left: { xs: 12, sm: 20 },
        right: { xs: 12, sm: 20 },
        bottom: { xs: 12, sm: 20 },
        zIndex: 1400,
        maxWidth: 560,
        mx: 'auto',
        background: '#FFFFFF',
        border: `1px solid ${tokens.edgeHi}`,
        borderRadius: '10px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 16px 40px -18px rgba(0,0,0,0.28)',
        p: { xs: 2, sm: 2.4 }
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6, flex: 1 }}>
          Signoff uses one strictly-necessary cookie to keep you signed in. No tracking or
          advertising cookies.{' '}
          <Box component={Link} to="/cookies" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Cookie Policy
          </Box>
        </Typography>
        <Button variant="contained" onClick={dismiss} sx={{ flexShrink: 0 }}>
          Got it
        </Button>
      </Stack>
    </Box>
  );
}
