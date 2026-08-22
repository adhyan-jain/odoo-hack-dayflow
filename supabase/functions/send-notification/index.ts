// =============================================================================
// Edge Function: send-notification
// =============================================================================
// What: Thin notification dispatcher, triggered by:
//         - pg_cron's escalate_overdue_leave_requests() (migration 010) via
//           pg_net.http_post, for type "leave_escalated"
//       It does no business-logic decision-making itself — it's purely
//       "given a type + target employee id, look up their email and deliver
//       a message." All the "who/when/why" already happened in SQL.
//
//       Emails are sent over Gmail's SMTP relay (smtp.gmail.com:587) via
//       denomailer. If GMAIL_USER / GMAIL_APP_PASSWORD are not set as
//       function secrets, this falls back to console.log — zero-config demo
//       path, same convention as the Next.js app's lib/email/mailer.ts.
//
//       Gmail requires an "App Password" (Google Account → Security →
//       2-Step Verification → App passwords), not the normal account
//       password.
//
// Auth: caller must send `Authorization: Bearer <service_role_key>` — this
//       function is only ever invoked by the trusted pg_net cron job (or an
//       admin manually testing it), never directly by a browser client.
//
// Deploy: supabase functions deploy send-notification
// Secrets: supabase secrets set GMAIL_USER=... GMAIL_APP_PASSWORD=...
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

interface NotificationPayload {
  type: "leave_escalated";
  leaveRequestId: string;
  notifyEmployeeId: string;
}

async function sendGmail(to: { email: string; name?: string }, subject: string, htmlContent: string) {
  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !pass) {
    console.log("[send-notification] GMAIL_USER/GMAIL_APP_PASSWORD not set — logging instead of sending.", {
      to,
      subject,
    });
    return;
  }

  const senderName = Deno.env.get("GMAIL_SENDER_NAME") || "Dayflow";
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 587,
      tls: false, // STARTTLS negotiated on connect for port 587
      auth: { username: user, password: pass },
    },
  });

  try {
    await client.send({
      from: `${senderName} <${user}>`,
      to: to.name ? `${to.name} <${to.email}>` : to.email,
      subject,
      html: htmlContent,
    });
  } finally {
    await client.close();
  }
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let payload: NotificationPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (payload.type !== "leave_escalated" || !payload.leaveRequestId || !payload.notifyEmployeeId) {
    return new Response(JSON.stringify({ error: "Unsupported or malformed notification type" }), { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  try {
    const [{ data: leaveRequest }, { data: notifyEmployee }] = await Promise.all([
      supabaseAdmin
        .from("leave_requests")
        .select("employee_id, leave_type, start_date, end_date")
        .eq("id", payload.leaveRequestId)
        .single(),
      supabaseAdmin
        .from("employees")
        .select("full_name, email")
        .eq("id", payload.notifyEmployeeId)
        .single(),
    ]);

    if (!leaveRequest || !notifyEmployee) {
      return new Response(JSON.stringify({ error: "Leave request or notify target not found" }), { status: 404 });
    }

    const { data: applicant } = await supabaseAdmin
      .from("employees")
      .select("full_name")
      .eq("id", leaveRequest.employee_id)
      .single();

    const subject = `Escalated: ${applicant?.full_name ?? "An employee"}'s overdue leave request`;
    const htmlContent = `
      <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px;">
        <h2>Leave request escalated to you</h2>
        <p>Hi ${notifyEmployee.full_name},</p>
        <p><strong>${applicant?.full_name ?? "An employee"}</strong>'s
        <strong>${leaveRequest.leave_type}</strong> leave request
        (${leaveRequest.start_date} to ${leaveRequest.end_date}) has breached its SLA
        and was escalated to you because the original approver did not act in time.</p>
        <p>Please review it in the Time Off tab of Dayflow.</p>
      </div>`;

    await sendGmail({ email: notifyEmployee.email, name: notifyEmployee.full_name }, subject, htmlContent);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("[send-notification] Failed:", err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: "Notification dispatch failed" }), { status: 500 });
  }
});
