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
//       Emails are sent via Brevo's transactional email HTTP API
//       (https://api.brevo.com/v3/smtp/email). If BREVO_API_KEY /
//       BREVO_SENDER_EMAIL are not set as function secrets, this falls back
//       to console.log — zero-config demo path, same convention as the
//       Next.js app's lib/email/mailer.ts.
//
//       BREVO_API_KEY is a v3 API key (Brevo → Settings → SMTP & API → API
//       Keys). BREVO_SENDER_EMAIL must be a sender verified on the account.
//
// Auth: caller must send `Authorization: Bearer <service_role_key>` — this
//       function is only ever invoked by the trusted pg_net cron job (or an
//       admin manually testing it), never directly by a browser client.
//
// Deploy: supabase functions deploy send-notification
// Secrets: supabase secrets set BREVO_API_KEY=... BREVO_SENDER_EMAIL=...
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendBrevo(to: { email: string; name?: string }, subject: string, htmlContent: string) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  if (!apiKey || !senderEmail) {
    console.log("[send-notification] BREVO_API_KEY/BREVO_SENDER_EMAIL not set — logging instead of sending.", {
      to,
      subject,
    });
    return;
  }

  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "Dayflow";

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [to],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[send-notification] Brevo API responded ${res.status}: ${body}`);
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

    await sendBrevo({ email: notifyEmployee.email, name: notifyEmployee.full_name }, subject, htmlContent);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("[send-notification] Failed:", err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: "Notification dispatch failed" }), { status: 500 });
  }
});
