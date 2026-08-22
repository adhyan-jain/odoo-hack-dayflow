/**
 * @file lib/email/mailer.ts
 * @what Thin wrapper around Gmail's SMTP relay (smtp.gmail.com:587) via
 *       nodemailer. Server-only — credentials must never reach the browser.
 * @exports sendEmail
 * @dependents app/api/employees/create, app/api/leave/apply, app/api/leave/action
 *
 * Zero-config demo path: if GMAIL_USER / GMAIL_APP_PASSWORD are not set,
 * sendEmail() logs the message to the console instead of throwing, so the
 * app runs end-to-end without a Gmail account configured.
 *
 * Gmail requires an "App Password" (not your normal login password) —
 * Google Account → Security → 2-Step Verification → App passwords. Plain
 * account passwords are rejected by Gmail's SMTP relay when 2FA is on
 * (and Google no longer allows "less secure app" access otherwise).
 *
 * Callers MUST treat email delivery as best-effort — wrap calls in try/catch
 * and never let a send failure fail the underlying business operation (the
 * leave request / employee record is the source of truth, not the email).
 */

import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/env';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailInput {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  htmlContent: string;
}

let cachedTransporter: Transporter | null = null;

function getTransporter(user: string, pass: string): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS on port 587
      auth: { user, pass },
    });
  }
  return cachedTransporter;
}

const fmtRecipient = (r: EmailRecipient) => (r.name ? `"${r.name}" <${r.email}>` : r.email);

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const user = env.GMAIL_USER;
  const pass = env.GMAIL_APP_PASSWORD;
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!user || !pass) {
    console.log('[mailer] GMAIL_USER/GMAIL_APP_PASSWORD not set — logging email instead of sending.', {
      to,
      subject: input.subject,
    });
    return;
  }

  const senderName = env.GMAIL_SENDER_NAME;
  const transporter = getTransporter(user, pass);

  await transporter.sendMail({
    from: `"${senderName}" <${user}>`,
    to: to.map(fmtRecipient).join(', '),
    subject: input.subject,
    html: input.htmlContent,
  });
}
