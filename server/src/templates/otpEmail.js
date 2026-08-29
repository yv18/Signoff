import { env } from '../config/env.js';

/** Plain, single-purpose verification email. Renders fine with images off. */
export function buildOtpEmail(to, name, code) {
  const app = env.APP_NAME;
  const greet = name ? `Hi ${name},` : 'Hi,';
  const text =
    `${greet}\n\n` +
    `Your ${app} verification code is ${code}\n` +
    `It expires in 10 minutes.\n\n` +
    `If you didn't try to create a ${app} account, you can ignore this email.`;

  const html = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:440px;margin:0 auto;color:#0A0A0A;">
  <p style="font-size:14px;line-height:1.6;">${greet}</p>
  <p style="font-size:14px;line-height:1.6;">Your ${app} verification code is:</p>
  <div style="font-size:30px;font-weight:700;letter-spacing:8px;background:#F2F2F3;border:1px solid #E6E6E8;border-radius:10px;padding:16px;text-align:center;margin:14px 0;">${code}</div>
  <p style="font-size:12.5px;color:#5A5A5E;line-height:1.6;">It expires in 10 minutes. If you didn't try to create a ${app} account, you can ignore this email.</p>
</div>`;

  return {
    from: env.MAIL_FROM,
    // Envelope MAIL FROM — providers like Gmail require this to be the
    // authenticated mailbox regardless of the header From.
    sender: env.SMTP_USER || undefined,
    to,
    subject: `${code} is your ${app} verification code`,
    text,
    html
  };
}
