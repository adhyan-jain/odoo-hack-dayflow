/**
 * @file lib/email/templates.ts
 * @what Plain-HTML email bodies for the transactional emails Dayflow sends
 *       via Gmail SMTP (see lib/email/mailer.ts). Kept as small pure functions so
 *       route handlers stay focused on business logic.
 */

import 'server-only';

const wrap = (title: string, bodyHtml: string) => `
<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1c1b;">
  <h2 style="color: #1a1c1b; margin-bottom: 4px;">${title}</h2>
  ${bodyHtml}
  <p style="color: #a1a1a1; font-size: 12px; margin-top: 32px;">Sent by Dayflow HRMS</p>
</div>`;

export function welcomeEmployeeEmail(opts: {
  fullName: string;
  companyName: string;
  loginId: string;
  temporaryPassword: string;
  signInUrl: string;
}): { subject: string; htmlContent: string } {
  return {
    subject: `Welcome to ${opts.companyName} on Dayflow`,
    htmlContent: wrap(
      `Welcome, ${opts.fullName}!`,
      `
      <p>Your Dayflow HRMS account for <strong>${opts.companyName}</strong> is ready.</p>
      <p style="background:#f4f4f1;border-radius:12px;padding:16px;">
        <strong>Login ID:</strong> ${opts.loginId}<br/>
        <strong>Temporary password:</strong> ${opts.temporaryPassword}
      </p>
      <p>You'll be asked to set a new password the first time you sign in.</p>
      <p><a href="${opts.signInUrl}" style="color:#5b7a6b;">Sign in to Dayflow →</a></p>
      `,
    ),
  };
}

export function leaveRequestSubmittedEmail(opts: {
  approverName: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
}): { subject: string; htmlContent: string } {
  return {
    subject: `Leave request from ${opts.employeeName} needs your approval`,
    htmlContent: wrap(
      'New leave request pending approval',
      `
      <p>Hi ${opts.approverName},</p>
      <p><strong>${opts.employeeName}</strong> requested <strong>${opts.leaveType}</strong> leave
      from <strong>${opts.fromDate}</strong> to <strong>${opts.toDate}</strong>.</p>
      <p>Review it in the Time Off tab of Dayflow.</p>
      `,
    ),
  };
}

export function leaveRequestDecisionEmail(opts: {
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  decision: 'approved' | 'rejected';
  comments?: string | null;
}): { subject: string; htmlContent: string } {
  const verb = opts.decision === 'approved' ? 'approved' : 'rejected';
  return {
    subject: `Your ${opts.leaveType} leave request was ${verb}`,
    htmlContent: wrap(
      `Leave request ${verb}`,
      `
      <p>Hi ${opts.employeeName},</p>
      <p>Your <strong>${opts.leaveType}</strong> leave request
      (${opts.fromDate} to ${opts.toDate}) was <strong>${verb}</strong>.</p>
      ${opts.comments ? `<p style="background:#f4f4f1;border-radius:12px;padding:16px;">"${opts.comments}"</p>` : ''}
      `,
    ),
  };
}
