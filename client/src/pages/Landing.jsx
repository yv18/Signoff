import { useState, useEffect } from 'react';
import {
  Box, Button, Stack, Typography, Avatar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert, CircularProgress
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import ReplayIcon from '@mui/icons-material/Replay';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import GlassCard from '../components/GlassCard.jsx';
import SignaturePreview from '../components/SignaturePreview.jsx';
import TemplateGallery from '../components/TemplateGallery.jsx';
import AnimationGallery from '../components/AnimationGallery.jsx';
import { tokens } from '../theme/theme.js';
import { useAuth } from '../context/AuthContext.jsx';

const SHELL = { width: 'min(1180px, calc(100% - 40px))', mx: 'auto' };

const SAMPLE = {
  fullName: 'Your Name',
  role: 'Job Title',
  company: 'Company Name',
  email: 'youremail@email.com',
  phone: '+1 (555) 012-3456',
  location: 'San Francisco, CA, USA',
  website: '',
  tagline: 'Building better products, one release at a time.',
  social: { linkedin: 'linkedin.com/in/example-data', x: 'x.com/example-data', instagram: 'instagram.com/example.data', youtube: '' },
  assets: { photoUrl: '', logoUrl: '' },
  accent: '#0A0A0A',
  avatarShape: 'circle',
  verified: true
};

const Eyebrow = ({ children }) => (
  <Stack direction="row" alignItems="center" spacing={1.2}>
    <Box sx={{ width: 22, height: '2px', background: '#000000' }} />
    <Typography variant="overline" sx={{ color: 'text.primary' }}>{children}</Typography>
  </Stack>
);

const STEPS = [
  { n: 'STEP 01', title: 'Build it', body: 'Fill in your details, upload a photo, pick a template. The preview updates as you type.' },
  { n: 'STEP 02', title: 'Render it', body: 'We turn your choice into an animated GIF sized for email and hosted for you.' },
  { n: 'STEP 03', title: 'Paste it', body: 'Gmail: Settings, then Signature. Outlook: File, Options, Mail, Signatures.' }
];

export default function Landing() {
  const { user, deleteAccount, errorMessage } = useAuth();
  const navigate = useNavigate();
  const [templateId, setTemplateId] = useState('mirra');
  const [animationId, setAnimationId] = useState('rise');
  const [replayKey, setReplayKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const t = setInterval(() => setReplayKey((k) => k + 1), 6000);
    return () => clearInterval(t);
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      setConfirmOpen(false);
      navigate('/', { replace: true });
    } catch (e) {
      setDeleteError(errorMessage(e, 'Could not delete your profile. Try again.'));
    } finally {
      setDeleting(false);
    }
  };

  const preview = { ...SAMPLE, templateId, animationId };

  return (
    <Box sx={SHELL}>
      {/* ---------------- hero ---------------- */}
      <Box sx={{
        display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 0.95fr' },
        gap: { xs: 5, md: 7 }, alignItems: 'center', py: { xs: 6, md: 8 }
      }}>
        <Box>
          <Eyebrow>Animated email signatures</Eyebrow>
          <Typography variant="h1" sx={{ fontSize: 'clamp(42px, 7vw, 72px)', my: 2.5 }}>
            Your last line<br />should move.
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: { xs: 15, md: 17.5 }, maxWidth: '46ch', lineHeight: 1.62 }}>
            Signoff is a free animated email signature generator. Add your photo, your company logo,
            and the profiles you actually use, then paste the signature into Gmail or Outlook in
            about a minute.
          </Typography>

          <Stack direction="row" spacing={1.5} sx={{ mt: 3.5 }} flexWrap="wrap" useFlexGap>
            <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} component={Link} to={user ? '/editor' : '/register'}>
              {user ? 'Open the editor' : 'Create your signature'}
            </Button>
            <Button variant="outlined" size="large" href="#templates">See the templates</Button>
          </Stack>

          <Typography sx={{ mt: 2.5, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'text.disabled' }}>
            Free forever. No card, no limits.
          </Typography>
        </Box>

        {/* the inbox: the product shown where it actually lives */}
        <Box sx={{ position: 'relative' }}>
          <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2.2, py: 1.7, borderBottom: `1px solid ${tokens.edge}`, background: '#FAFAFA' }}>
              {[0, 1, 2].map((i) => <Box key={i} sx={{ width: 8, height: 8, borderRadius: '2px', background: tokens.edgeHi }} />)}
              <Typography sx={{ ml: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'text.disabled' }}>
                inbox / 1 new
              </Typography>
            </Stack>

            <Box sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.4} alignItems="center" sx={{ mb: 2.2 }}>
                <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, color: '#fff', background: '#000000', borderRadius: '10px' }}>
                  YR
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Yashraj Raj</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>Re: Proposal for the Q4 rollout</Typography>
                </Box>
              </Stack>

              <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.7, mb: 2.5 }}>
                Thanks for sending this across. The timeline works on our side. I'll get the contract
                over to you by Thursday.
              </Typography>

              <Box sx={{ height: '1px', background: tokens.edge, mb: 2.5 }} />

              <SignaturePreview data={preview} replayKey={replayKey} />
            </Box>
          </GlassCard>

          <IconButton
            onClick={() => setReplayKey((k) => k + 1)}
            aria-label="Replay animation"
            sx={{ position: 'absolute', right: 16, bottom: 16, background: '#fff', border: `1px solid ${tokens.edge}`, borderRadius: '10px' }}
          >
            <ReplayIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      </Box>

      {/* ---------------- templates ---------------- */}
      <Box component="section" id="templates" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ maxWidth: 620, mb: 5.5 }}>
          <Eyebrow>The templates</Eyebrow>
          <Typography variant="h2" sx={{ fontSize: 'clamp(30px, 4.4vw, 44px)', my: 1.8 }}>
            Twelve ways to sign off.
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 17, lineHeight: 1.6 }}>
            Plain layouts, a frosted glass card, an animated spotlight, and themed cards for Marvel,
            cricket, football and government. Pick one to see it in the inbox above.
          </Typography>
        </Box>

        <TemplateGallery value={templateId} onChange={setTemplateId} columns={3} />
      </Box>

      {/* ---------------- animations ---------------- */}
      <Box component="section" id="animations" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ maxWidth: 620, mb: 5.5 }}>
          <Eyebrow>The library</Eyebrow>
          <Typography variant="h2" sx={{ fontSize: 'clamp(30px, 4.4vw, 44px)', my: 1.8 }}>
            Eight ways to arrive.
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 17, lineHeight: 1.6 }}>
            Hover any card to watch it play, or tap to try it on the sample.
          </Typography>
        </Box>

        <AnimationGallery value={animationId} onChange={setAnimationId} columns={4} />
      </Box>

      {/* ---------------- setup ---------------- */}
      <Box component="section" id="setup" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ maxWidth: 620, mb: 5.5 }}>
          <Eyebrow>Getting it into your inbox</Eyebrow>
          <Typography variant="h2" sx={{ fontSize: 'clamp(30px, 4.4vw, 44px)', mt: 1.8 }}>
            Three steps, and it's live.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {STEPS.map((s) => (
            <GlassCard key={s.n} sx={{ p: 3.2 }}>
              <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'text.primary', letterSpacing: '.14em', mb: 1.8 }}>
                {s.n}
              </Typography>
              <Typography variant="h6" sx={{ fontSize: 19 }}>{s.title}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14, mt: 1 }}>{s.body}</Typography>
            </GlassCard>
          ))}
        </Box>
      </Box>

      {/* ---------------- danger zone (signed-in only) ---------------- */}
      {user && (
        <Box
          component="section"
          sx={{
            mb: { xs: 6, md: 8 }, p: { xs: 2.6, md: 3.2 }, borderRadius: '14px',
            border: '1px solid #F1C0C0', background: '#FEF6F6'
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box sx={{ maxWidth: '60ch' }}>
              <Typography variant="h6" sx={{ fontSize: 17, mb: 0.6 }}>Delete profile</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13.5, lineHeight: 1.6 }}>
                Permanently removes your account, every signature, and all uploaded images. Hosted
                signature GIFs stop loading. This cannot be undone.
              </Typography>
            </Box>
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => { setDeleteError(''); setConfirmOpen(true); }}
              sx={{ flexShrink: 0 }}
            >
              Delete profile
            </Button>
          </Stack>
        </Box>
      )}

      <Dialog open={confirmOpen} onClose={() => !deleting && setConfirmOpen(false)}>
        <DialogTitle>Delete your profile?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14 }}>
            This deletes your account, {user?.email ? <strong>{user.email}</strong> : 'your account'},
            along with every signature and uploaded image. Any signature already pasted into an email
            client will stop showing its image. This cannot be undone.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={15} color="inherit" /> : <DeleteOutlineIcon />}
          >
            {deleting ? 'Deleting…' : 'Delete profile'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(deleteError) && !confirmOpen}
        autoHideDuration={4000}
        onClose={() => setDeleteError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setDeleteError('')}>
          {deleteError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
