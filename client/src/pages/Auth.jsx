import { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import GlassCard from '../components/GlassCard.jsx';

/** Login is one step. Register is two: request an emailed code, then verify it. */
export default function Auth({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const { login, registerStart, registerVerify, registerResend, errorMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const goto = (next) => navigate(location.state?.from || next || '/editor', { replace: true });

  const submitLogin = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login({ email: form.email, password: form.password });
      goto();
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in.'));
    } finally {
      setBusy(false);
    }
  };

  const startRegister = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await registerStart(form);
      setDevCode(data.devCode || '');
      setNotice(`We emailed a 6-digit code to ${form.email}.`);
      setStep('code');
    } catch (err) {
      setError(errorMessage(err, 'Could not start your sign-up.'));
    } finally {
      setBusy(false);
    }
  };

  const verifyRegister = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await registerVerify({ email: form.email, code: code.trim() });
      // New accounts land on the landing page, not straight into the editor.
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not verify that code.'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    setBusy(true);
    try {
      await registerResend(form.email);
      setNotice(`A new code is on its way to ${form.email}.`);
    } catch (err) {
      setError(errorMessage(err, 'Could not resend the code.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '78vh', px: 2.5 }}>
      <GlassCard sx={{ p: { xs: 3, sm: 4.5 }, width: '100%', maxWidth: 430 }}>
        <Typography variant="h3" sx={{ fontSize: 26 }}>
          {isRegister ? (step === 'code' ? 'Check your email' : 'Create your account') : 'Welcome back'}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14, mt: 1, mb: 3 }}>
          {isRegister
            ? step === 'code'
              ? 'Enter the 6-digit code we sent to confirm your address.'
              : 'Free forever, no card. We email a code to confirm your address.'
            : 'Pick up where your signature left off.'}
        </Typography>

        {/* ---------------- login ---------------- */}
        {!isRegister && (
          <Box component="form" onSubmit={submitLogin} noValidate>
            <Stack spacing={2}>
              <TextField label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={set('password')}
                autoComplete="current-password"
                helperText=" "
                required
              />
              {error && <Typography sx={{ color: '#D32F2F', fontSize: 13 }}>{error}</Typography>}
              <Button type="submit" variant="contained" fullWidth disabled={busy}>
                {busy ? 'Working…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        )}

        {/* ---------------- register: details ---------------- */}
        {isRegister && step === 'form' && (
          <Box component="form" onSubmit={startRegister} noValidate>
            <Stack spacing={2}>
              <TextField label="Name" value={form.name} onChange={set('name')} autoComplete="name" required />
              <TextField label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
                helperText="At least 8 characters, with a letter and a number."
                required
              />
              {error && <Typography sx={{ color: '#D32F2F', fontSize: 13 }}>{error}</Typography>}
              <Button type="submit" variant="contained" fullWidth disabled={busy}>
                {busy ? 'Sending code…' : 'Send verification code'}
              </Button>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', textAlign: 'center', lineHeight: 1.6 }}>
                By continuing you agree to our{' '}
                <Box component={Link} to="/terms" sx={{ color: 'text.secondary' }}>Terms</Box> and{' '}
                <Box component={Link} to="/privacy" sx={{ color: 'text.secondary' }}>Privacy Policy</Box>.
              </Typography>
            </Stack>
          </Box>
        )}

        {/* ---------------- register: code ---------------- */}
        {isRegister && step === 'code' && (
          <Box component="form" onSubmit={verifyRegister} noValidate>
            <Stack spacing={2}>
              {notice && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{notice}</Typography>}
              {devCode && (
                <Typography sx={{ fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", color: 'text.disabled', background: '#F6F6F7', border: '1px solid #E6E6E8', borderRadius: '10px', p: 1.2 }}>
                  Dev mode — your code is {devCode}
                </Typography>
              )}
              <TextField
                label="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ inputMode: 'numeric', maxLength: 6, style: { letterSpacing: '0.4em', fontFamily: "'JetBrains Mono', monospace" } }}
                autoFocus
                required
              />
              {error && <Typography sx={{ color: '#D32F2F', fontSize: 13 }}>{error}</Typography>}
              <Button type="submit" variant="contained" fullWidth disabled={busy || code.length !== 6}>
                {busy ? 'Verifying…' : 'Verify & create account'}
              </Button>
              <Stack direction="row" justifyContent="space-between">
                <Button variant="text" size="small" onClick={() => { setStep('form'); setError(''); setCode(''); }}>
                  ← Change details
                </Button>
                <Button variant="text" size="small" onClick={resend} disabled={busy}>
                  Resend code
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        <Typography sx={{ textAlign: 'center', mt: 3, fontSize: 13.5, color: 'text.disabled' }}>
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <Box component={Link} to={isRegister ? '/login' : '/register'} sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none' }}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </Box>
        </Typography>
      </GlassCard>
    </Box>
  );
}
