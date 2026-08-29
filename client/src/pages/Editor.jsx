import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box, Stack, Tabs, Tab, TextField, Typography, Button, Snackbar, Alert,
  IconButton, CircularProgress, Tooltip
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VerifiedIcon from '@mui/icons-material/Verified';

import GlassCard from '../components/GlassCard.jsx';
import SignaturePreview from '../components/SignaturePreview.jsx';
import TemplateGallery from '../components/TemplateGallery.jsx';
import AnimationGallery from '../components/AnimationGallery.jsx';
import { api, errorMessage } from '../api/client.js';
import { EMPTY_SIGNATURE, ACCENTS, AVATAR_SHAPES } from '../data/catalog.js';
import { tokens } from '../theme/theme.js';

const FIELD_TABS = ['Details', 'Profiles', 'Style'];

/** The subset of a signature the autosave sends. Everything else is server-owned. */
const savableBody = (s) => {
  const { assets, id, render, createdAt, updatedAt, ...body } = s;
  return body;
};
// Key-order-stable so a server echo compares equal to what we sent.
const snapshot = (s) => {
  const body = savableBody(s);
  const keys = new Set();
  JSON.stringify(body, (k, v) => (keys.add(k), v));
  return JSON.stringify(body, [...keys].sort());
};

export default function Editor() {
  const [sig, setSig] = useState(null);
  const [tab, setTab] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [html, setHtml] = useState('');
  const [renderWarning, setRenderWarning] = useState('');
  const [toast, setToast] = useState(null);

  const photoInput = useRef(null);
  const logoInput = useRef(null);
  const saveTimer = useRef(null);
  const firstLoad = useRef(true);
  // Snapshot of the last content we sent to the server. Guards the autosave
  // effect against re-firing on its own echoed state update (which would
  // otherwise loop a PUT every 700ms).
  const lastSaved = useRef(null);

  // --- load ---------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/signatures');
        if (data.signatures.length) {
          setSig(data.signatures[0]);
        } else {
          const created = await api.post('/signatures', EMPTY_SIGNATURE);
          setSig(created.data.signature);
        }
      } catch (e) {
        setToast({ severity: 'error', message: errorMessage(e, 'Could not load your signature.') });
      }
    })();
  }, []);

  // --- autosave -----------------------------------------------------------
  const persist = useCallback(async (next) => {
    setSaving(true);
    // Record what we are about to send before the response echoes back into
    // state, so the autosave effect treats that echo as already-saved.
    lastSaved.current = snapshot(next);
    try {
      const { data } = await api.put(`/signatures/${next.id}`, savableBody(next));
      lastSaved.current = snapshot(data.signature);
      setSig((cur) => ({ ...data.signature, assets: cur.assets }));
      setHtml('');
    } catch (e) {
      setToast({ severity: 'error', message: errorMessage(e, 'Could not save.') });
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!sig) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      lastSaved.current = snapshot(sig);
      return;
    }
    // Nothing the server cares about changed — skip (this is how the loop ends).
    if (snapshot(sig) === lastSaved.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(sig), 700);
    return () => clearTimeout(saveTimer.current);
  }, [sig, persist]);

  const set = (key) => (e) => setSig((s) => ({ ...s, [key]: e.target.value }));
  const setSocial = (key) => (e) =>
    setSig((s) => ({ ...s, social: { ...s.social, [key]: e.target.value } }));

  // --- uploads ------------------------------------------------------------
  const upload = async (kind, file) => {
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    try {
      const { data } = await api.post(`/signatures/${sig.id}/asset/${kind}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSig(data.signature);
      setToast({ severity: 'success', message: kind === 'photo' ? 'Photo added' : 'Logo added' });
    } catch (e) {
      setToast({ severity: 'error', message: errorMessage(e, 'Upload failed.') });
    }
  };

  const clearAsset = async (kind) => {
    try {
      const { data } = await api.delete(`/signatures/${sig.id}/asset/${kind}`);
      setSig(data.signature);
    } catch (e) {
      setToast({ severity: 'error', message: errorMessage(e) });
    }
  };

  // --- publish ------------------------------------------------------------
  const publish = async () => {
    setPublishing(true);
    try {
      const { data } = await api.post(`/signatures/${sig.id}/publish`);
      setSig(data.signature);
      setHtml(data.html);
      setRenderWarning(data.warning || '');
      setToast({ severity: 'success', message: `Rendered — ${(data.bytes / 1024).toFixed(0)} KB` });
    } catch (e) {
      setToast({ severity: 'error', message: errorMessage(e, 'Render failed.') });
    } finally {
      setPublishing(false);
    }
  };

  /**
   * Writes text/html to the clipboard so it pastes into Gmail as a formatted
   * signature rather than as visible markup.
   */
  const copySignature = async () => {
    if (!html) {
      setToast({ severity: 'info', message: 'Render it first, then copy.' });
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([sig.fullName || ''], { type: 'text/plain' })
        })
      ]);
      setToast({ severity: 'success', message: 'Copied — paste into Gmail or Outlook' });
    } catch {
      await navigator.clipboard.writeText(html);
      setToast({ severity: 'success', message: 'Markup copied' });
    }
  };

  const previewData = useMemo(() => sig || EMPTY_SIGNATURE, [sig]);

  if (!sig) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: 'min(1180px, calc(100% - 40px))', mx: 'auto', py: 2.5, pb: 9 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '400px 1fr' }, gap: 2.5, alignItems: 'start' }}>

        {/* ---------------- form ---------------- */}
        <GlassCard sx={{ p: 2.8 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Your signature</Typography>
            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'text.disabled' }}>
              {saving ? 'Saving…' : 'Saved'}
            </Typography>
          </Stack>

          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            variant="fullWidth"
            sx={{ mb: 2.5, minHeight: 38, '& .MuiTab-root': { minHeight: 38, fontSize: 13 } }}
          >
            {FIELD_TABS.map((t) => <Tab key={t} label={t} />)}
          </Tabs>

          {tab === 0 && (
            <Stack spacing={2}>
              <TextField label="Full name" value={sig.fullName} onChange={set('fullName')} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.4}>
                <TextField label="Role" value={sig.role} onChange={set('role')} />
                <TextField label="Company" value={sig.company} onChange={set('company')} />
              </Stack>
              <TextField label="Email" value={sig.email} onChange={set('email')} />
              <TextField label="Phone" value={sig.phone} onChange={set('phone')} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.4}>
                <TextField label="Location" value={sig.location} onChange={set('location')} />
                <TextField label="Website" value={sig.website} onChange={set('website')} />
              </Stack>
              <TextField label="Tagline" value={sig.tagline} onChange={set('tagline')} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.4}>
                <UploadSlot
                  label="Your photo"
                  hint="Square image"
                  url={sig.assets?.photoUrl}
                  Icon={PhotoCameraOutlinedIcon}
                  inputRef={photoInput}
                  onPick={(f) => upload('photo', f)}
                  onClear={() => clearAsset('photo')}
                />
                <UploadSlot
                  label="Company logo"
                  hint="Optional"
                  url={sig.assets?.logoUrl}
                  Icon={BusinessOutlinedIcon}
                  inputRef={logoInput}
                  onPick={(f) => upload('logo', f)}
                  onClear={() => clearAsset('logo')}
                />
              </Stack>
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 12.5, color: 'text.disabled' }}>
                Leave a field blank and its icon stays out of the signature.
              </Typography>
              <TextField label="LinkedIn" value={sig.social.linkedin} onChange={setSocial('linkedin')} />
              <TextField label="X" value={sig.social.x} onChange={setSocial('x')} />
              <TextField label="Instagram" value={sig.social.instagram} onChange={setSocial('instagram')} />
              <TextField label="YouTube" value={sig.social.youtube} onChange={setSocial('youtube')} />
            </Stack>
          )}

          {tab === 2 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.2 }}>Template</Typography>
                <TemplateGallery
                  value={sig.templateId}
                  onChange={(templateId) => setSig((s) => ({ ...s, templateId }))}
                  columns={2}
                />
              </Box>

              <Box>
                <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.2 }}>Name badge</Typography>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setSig((s) => ({ ...s, verified: !s.verified }))}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', font: 'inherit',
                    px: 1.4, py: 0.9, borderRadius: '10px', color: 'text.primary',
                    background: sig.verified ? '#F2F2F3' : '#fff',
                    border: `1px solid ${sig.verified ? '#000' : tokens.edge}`
                  }}
                >
                  <VerifiedIcon sx={{ fontSize: 18, color: sig.verified ? '#1D9BF0' : tokens.faint }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                    {sig.verified ? 'Blue tick shown after your name' : 'Add a blue tick after your name'}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.2 }}>Avatar shape</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {AVATAR_SHAPES.map((s) => {
                    const selected = (sig.avatarShape || 'rounded') === s.id;
                    return (
                      <Box
                        key={s.id}
                        component="button"
                        type="button"
                        onClick={() => setSig((cur) => ({ ...cur, avatarShape: s.id }))}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.9, cursor: 'pointer', font: 'inherit',
                          px: 1.2, py: 0.8, borderRadius: '10px',
                          background: selected ? '#F2F2F3' : '#fff',
                          border: `1px solid ${selected ? '#000' : tokens.edge}`,
                          color: 'text.primary'
                        }}
                      >
                        <Box sx={{
                          width: 18, height: 18, background: 'currentColor', opacity: 0.85,
                          borderRadius: s.radius === '50%' ? '50%' : s.radius
                        }} />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              <Box>
                <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.2 }}>Accent colour</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {ACCENTS.map((c) => (
                    <Box
                      key={c}
                      component="button"
                      type="button"
                      aria-label={`Accent ${c}`}
                      onClick={() => setSig((s) => ({ ...s, accent: c }))}
                      sx={{
                        width: 30, height: 30, borderRadius: '9px', background: c, cursor: 'pointer',
                        border: `2px solid ${sig.accent === c ? tokens.paper : 'transparent'}`,
                        transition: '.2s', '&:hover': { transform: 'scale(1.1)' }
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 1.2 }}>Animation</Typography>
                <AnimationGallery
                  value={sig.animationId}
                  onChange={(animationId) => setSig((s) => ({ ...s, animationId }))}
                  columns={2}
                />
              </Box>
            </Stack>
          )}
        </GlassCard>

        {/* ---------------- preview ---------------- */}
        <Box>
          <GlassCard sx={{ p: 0, overflow: 'hidden', position: { lg: 'sticky' }, top: 80 }}>
            <Stack direction="row" alignItems="center" spacing={1.2} useFlexGap sx={{ px: 2.2, py: 1.5, borderBottom: `1px solid ${tokens.edge}`, background: '#FAFAFA', flexWrap: 'wrap', rowGap: 1 }}>
              <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'text.disabled', flex: 1, minWidth: 90 }}>
                Live preview
              </Typography>
              <Tooltip title="Replay animation">
                <IconButton size="small" onClick={() => setReplayKey((k) => k + 1)}>
                  <ReplayIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
              <Button variant="outlined" onClick={publish} disabled={publishing}>
                {publishing ? 'Rendering…' : 'Render GIF'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                onClick={copySignature}
              >
                Copy
              </Button>
            </Stack>

            <Box sx={{
              p: { xs: 2, sm: 4 }, minHeight: 260, display: 'flex', alignItems: 'center',
              background: '#FAFAFA', overflowX: 'auto'
            }}>
              <SignaturePreview data={previewData} replayKey={replayKey} />
            </Box>
          </GlassCard>

          <GlassCard sx={{ p: 2.8, mt: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.8 }}>
              <Typography variant="h6">Exported markup</Typography>
              {sig.render?.bytes > 0 && (
                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: 'text.disabled' }}>
                  {(sig.render.bytes / 1024).toFixed(0)} KB
                </Typography>
              )}
            </Stack>

            <Box
              component="pre"
              sx={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.75,
                color: 'text.secondary', background: '#F6F6F7', border: `1px solid ${tokens.edge}`,
                borderRadius: '10px', p: 1.9, maxHeight: 200, overflow: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0
              }}
            >
              {html || 'Render the GIF to generate your paste-ready markup.'}
            </Box>

            {renderWarning && (
              <Stack direction="row" spacing={1.4} sx={{ mt: 1.8, p: 1.8, borderRadius: '10px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: tokens.amber, mt: 0.2 }} />
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
                  {renderWarning} In Gmail and Outlook, images are fetched by the mail
                  provider's servers, which cannot reach a local address. Deploy the API to a
                  public HTTPS host — or run a tunnel such as{' '}
                  <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
                    cloudflared tunnel --url http://localhost:5000
                  </Box>{' '}
                  — set <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>PUBLIC_URL</Box> to it, restart the server, then Render again.
                </Typography>
              </Stack>
            )}

            <Stack direction="row" spacing={1.4} sx={{ mt: 1.8, p: 1.8, borderRadius: '10px', background: '#F6F6F7', border: `1px solid ${tokens.edge}` }}>
              <InfoOutlinedIcon sx={{ fontSize: 17, color: tokens.faint, mt: 0.2 }} />
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
                Email clients cannot run CSS, so the animation ships as a hosted GIF. Outlook on Windows
                shows the first frame only, which is why every preset starts and ends on the finished signature.
              </Typography>
            </Stack>
          </GlassCard>
        </Box>
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast && (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}

/** Upload tile that doubles as a thumbnail once something is attached. */
function UploadSlot({ label, hint, url, Icon, inputRef, onPick, onClear }) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', mb: 0.8 }}>{label}</Typography>
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          border: `1px dashed ${tokens.edgeHi}`, borderRadius: '10px', p: 1.6, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 1.4, transition: '.2s',
          '&:hover': { borderColor: '#000000', background: '#F2F2F3' }
        }}
      >
        {url ? (
          <Box component="img" src={url} alt="" sx={{ width: 40, height: 40, borderRadius: '9px', objectFit: 'cover' }} />
        ) : (
          <Icon sx={{ fontSize: 20, color: 'text.secondary' }} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>{url ? 'Replace' : 'Upload'}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{hint}</Typography>
        </Box>
        {url && (
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            aria-label={`Remove ${label}`}
          >
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </Box>
  );
}
