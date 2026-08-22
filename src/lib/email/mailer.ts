/**
 * @file lib/email/mailer.ts
 * @what Thin wrapper around Brevo's transactional email HTTP API
 *       (https://api.brevo.com/v3/smtp/email). Server-only — credentials
 *       must never reach the browser.
 * @exports sendEmail
 * @dependents app/api/employees/create, app/api/leave/apply, app/api/leave/action
 *
 * Zero-config demo path: if BREVO_API_KEY is not set, sendEmail() logs the
 * message to the console instead of throwing, so the app runs end-to-end
 * without a Brevo account configured.
 *
 * BREVO_API_KEY is a v3 API key generated at Brevo → Settings → SMTP & API
 * → API Keys. BREVO_SENDER_EMAIL must be a sender verified on the Brevo
 * account (Settings → Senders & IP).
 *
 * Callers MUST treat email delivery as best-effort — wrap calls in try/catch
 * and never let a send failure fail the underlying business operation (the
 * leave request / employee record is the source of truth, not the email).
 */

import 'server-only';
import { env } from '@/env';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailInput {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  htmlContent: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = env.BREVO_API_KEY;
  const senderEmail = env.BREVO_SENDER_EMAIL;
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!apiKey || !senderEmail) {
    console.log('[mailer] BREVO_API_KEY/BREVO_SENDER_EMAIL not set — logging email instead of sending.', {
      to,
      subject: input.subject,
    });
    return;
  }

  const senderName = env.BREVO_SENDER_NAME;

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to,
      subject: input.subject,
      htmlContent: input.htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[mailer] Brevo API responded ${res.status}: ${body}`);
  }
}
