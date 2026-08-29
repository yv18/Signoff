import { Box, Typography, Stack } from '@mui/material';
import GlassCard from '../components/GlassCard.jsx';
import { tokens } from '../theme/theme.js';

const UPDATED = '29 August 2026';
const CONTACT = 'rajyashraj333@gmail.com';

const DOCS = {
  about: {
    kind: 'Company',
    dated: false,
    title: 'About Signoff',
    intro:
      'Signoff is a small independent product that turns a handful of form fields into an animated email signature you can paste into Gmail, Outlook, or Apple Mail.',
    sections: [
      ['What it does', [
        'You fill in your details, choose a template and an animation, and Signoff renders it on the server into a single hosted GIF plus paste-ready markup.',
        'Every template and animation is free. There is no paid tier and nothing is held back.'
      ]],
      ['Who runs it', [
        'Signoff is founded, built, and maintained by Yashraj Raj, Founder of Signoff.',
        'It is run as an independent project, not on behalf of any other company.'
      ]],
      ['Contact', [
        `Any inquiry — support, feedback, privacy requests, press, or partnership — goes to ${CONTACT}. We aim to reply within a few business days.`
      ]]
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This policy explains what personal data Signoff collects when you build an email signature, why, and what rights you have over it.',
    sections: [
      ['What we collect', [
        'Account: your name, email address, and a bcrypt hash of your password.',
        'Signature content you enter: name, role, company, email, phone, location, tagline, and social profile URLs.',
        'Uploaded images: your photo and company logo.',
        'Technical: a session identifier, IP address for rate-limiting and abuse prevention, and basic request logs.'
      ]],
      ['How it is protected', [
        'Every personal field you type is encrypted at rest with AES-256-GCM using a per-value random IV and an authentication tag.',
        'Passwords are hashed with bcrypt (cost 12) and are never stored or logged in readable form.',
        'Uploaded images are re-encoded on the server, which strips EXIF metadata including GPS location.',
        'The email address used for sign-in is additionally stored as a keyed one-way hash so we can look up an account without keeping a reversible copy.'
      ]],
      ['Why we use it', [
        'To create and secure your account and keep you signed in.',
        'To render your signature into the hosted image that email clients display.',
        'To send you a one-time verification code during sign-up.',
        'To detect and limit abuse (rate limiting).'
      ]],
      ['Sharing', [
        'We do not sell your data.',
        'We use service providers strictly to run the product: a hosting provider, and an email delivery provider for the verification code. They process data on our instructions only.',
        'We may disclose data if required by law.'
      ]],
      ['Retention', [
        'Account and signature data is kept until you delete your account.',
        'Pending (unverified) sign-ups are automatically deleted 10 minutes after the code is issued.',
        'Session tokens expire and are purged automatically.'
      ]],
      ['Your rights', [
        `You can request access to, correction of, export of, or deletion of your data by emailing ${CONTACT}.`,
        'Deleting your account removes your user record, signatures, and uploaded images.'
      ]],
      ['Children', ['Signoff is not directed at children under 16 and we do not knowingly collect their data.']],
      ['Changes', ['We will update this page and the date above when this policy changes materially.']]
    ]
  },
  terms: {
    title: 'Terms of Service',
    intro: 'By creating a Signoff account or using the service you agree to these terms.',
    sections: [
      ['The service', [
        'Signoff lets you build an email signature, renders it into a hosted image, and gives you paste-ready markup for Gmail and Outlook.',
        'The service is provided free of charge and "as is", without warranties of any kind.'
      ]],
      ['Your account', [
        'You must provide accurate details and keep your password confidential.',
        'You are responsible for activity under your account.',
        'One person or organisation per account.'
      ]],
      ['Acceptable use', [
        'Do not upload content you do not have the right to use, or content that is unlawful, infringing, or malicious.',
        'Do not attempt to disrupt, overload, reverse-engineer, or gain unauthorised access to the service.',
        'We may suspend or remove accounts that break these rules.'
      ]],
      ['Your content', [
        'You keep all rights to the details and images you upload.',
        'You grant us the limited licence needed to store, process, and render that content so the product can function.'
      ]],
      ['Availability & changes', [
        'We may change, suspend, or discontinue any part of the service at any time.',
        'We may update these terms; continued use after a change means you accept the new terms.'
      ]],
      ['Liability', [
        'To the maximum extent permitted by law, Signoff is not liable for indirect or consequential losses, or for loss of data, arising from use of the service.'
      ]],
      ['Termination', [
        'You can stop using Signoff and delete your account at any time.',
        'We may terminate access for breach of these terms.'
      ]]
    ]
  },
  cookies: {
    title: 'Cookie Policy',
    intro:
      'Signoff keeps cookie use to the minimum needed to run the product. We do not use analytics, advertising, or cross-site tracking cookies.',
    sections: [
      ['Strictly necessary', [
        'sg_rt — an httpOnly, SameSite cookie that holds your rotating session (refresh) token so you stay signed in. It is not readable by JavaScript and is removed when you sign out. No consent is required for this cookie.'
      ]],
      ['Local storage', [
        'We store a short-lived access token and a note that you have seen this cookie notice in your browser’s local storage. This never leaves your device and is cleared when you sign out or clear site data.'
      ]],
      ['What we do not use', [
        'No Google Analytics or similar.',
        'No advertising or retargeting pixels.',
        'No third-party social or embed cookies.'
      ]],
      ['Managing cookies', [
        'You can clear cookies and local storage in your browser settings at any time; doing so will sign you out.',
        'Blocking the session cookie will prevent sign-in from working.'
      ]]
    ]
  }
};

const SHELL = { width: 'min(760px, calc(100% - 40px))', mx: 'auto', py: { xs: 5, md: 8 } };

export default function Legal({ doc = 'privacy' }) {
  const d = DOCS[doc] || DOCS.privacy;

  return (
    <Box sx={SHELL}>
      <Typography variant="overline" sx={{ color: 'text.disabled' }}>{d.kind || 'Legal'}</Typography>
      <Typography variant="h2" sx={{ fontSize: 'clamp(28px, 5vw, 40px)', my: 1.5 }}>
        {d.title}
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: 15.5, lineHeight: 1.7, mb: d.dated === false ? 4 : 1 }}>{d.intro}</Typography>
      {d.dated !== false && (
        <Typography sx={{ color: 'text.disabled', fontSize: 12.5, mb: 4 }}>Last updated {UPDATED}</Typography>
      )}

      <Stack spacing={3}>
        {d.sections.map(([heading, items]) => (
          <GlassCard key={heading} sx={{ p: { xs: 2.4, sm: 3 } }}>
            <Typography variant="h6" sx={{ fontSize: 17, mb: 1.2 }}>{heading}</Typography>
            <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.4 }}>
              {items.map((it, idx) => (
                <Typography key={idx} component="li" sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.65 }}>
                  {it}
                </Typography>
              ))}
            </Stack>
          </GlassCard>
        ))}
      </Stack>

      <Box sx={{ mt: 4, p: 2.2, borderRadius: '10px', background: '#F6F6F7', border: `1px solid ${tokens.edge}` }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
          Questions about this page, or anything else? Email{' '}
          <Box component="a" href={`mailto:${CONTACT}`} sx={{ color: 'text.primary', fontWeight: 600, textDecoration: 'none' }}>
            {CONTACT}
          </Box>.
        </Typography>
      </Box>
    </Box>
  );
}
