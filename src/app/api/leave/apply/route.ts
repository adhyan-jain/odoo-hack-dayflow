/**
 * @file app/api/leave/apply/route.ts
 * @what POST endpoint to submit a new leave request.
 *       Validates date range, resolves approver via get_manager_chain RPC,
 *       inserts into leave_requests with status='pending'.
 * @exports POST
 * @dependents Frontend leave application form
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/mailer';
import { leaveRequestSubmittedEmail } from '@/lib/email/templates';
import type { ApiResponse, LeaveRequest, LeaveType } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<LeaveRequest>>> {
  // ── 1. Verify session ───────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse and validate body ──────────────────────────────────────────────
  let body: { leave_type?: unknown; from_date?: unknown; to_date?: unknown; remarks?: unknown; attachment_url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { leave_type, from_date, to_date, remarks, attachment_url } = body;

  if (!leave_type || !from_date || !to_date) {
    return NextResponse.json(
      { data: null, error: 'Missing required fields: leave_type, from_date, to_date' },
      { status: 400 },
    );
  }

  const validLeaveTypes: LeaveType[] = ['paid', 'sick', 'unpaid'];
  if (!validLeaveTypes.includes(leave_type as LeaveType)) {
    return NextResponse.json(
      { data: null, error: 'leave_type must be one of: paid, sick, unpaid' },
      { status: 400 },
    );
  }

  // Sick leave requires an attachment (certificate) per the Time Off request
  // form spec — every other leave type leaves it optional.
  if (leave_type === 'sick' && (typeof attachment_url !== 'string' || !attachment_url.trim())) {
    return NextResponse.json(
      { data: null, error: 'A sick-leave certificate attachment is required' },
      { status: 400 },
    );
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(from_date as string) || !dateRegex.test(to_date as string)) {
    return NextResponse.json(
      { data: null, error: 'from_date and to_date must be in YYYY-MM-DD format' },
      { status: 400 },
    );
  }

  const fromDate = new Date(from_date as string);
  const toDate   = new Date(to_date as string);
  const today    = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (fromDate < today) {
    return NextResponse.json(
      { data: null, error: 'from_date cannot be in the past' },
      { status: 400 },
    );
  }

  if (toDate < fromDate) {
    return NextResponse.json(
      { data: null, error: 'to_date must be on or after from_date' },
      { status: 400 },
    );
  }

  // ── 3. Resolve approver (direct manager) via get_manager_chain RPC ──────────
  // Purely informational for the wireframe's role-based (Admin/HR) approval
  // model — Admin/HR already get 'allow' from canAccess() regardless of this
  // value. It's kept so a direct manager can *also* act (canAccess §4), and
  // so the escalation cron has a skip-level chain to walk if this employee
  // does have a manager in reporting_edges.
  const today_str = new Date().toISOString().slice(0, 10);
  const { data: chainData } = await supabaseAdmin
    .rpc('get_manager_chain', { employee_uuid: user.id, as_of: today_str });

  const chain = chainData as Array<{ manager_id: string; depth: number }> | null; // RPC result, shape guaranteed by migration 009
  const directManager = chain?.find((m) => m.depth === 1);
  const approverId = directManager?.manager_id ?? null;

  // ── 4. Insert leave request ─────────────────────────────────────────────────
  const { data: leave, error: insertError } = await supabaseAdmin
    .from('leave_requests')
    .insert({
      employee_id:    user.id,
      leave_type:     leave_type as LeaveType,
      start_date:     from_date as string,
      end_date:       to_date as string,
      remarks:        typeof remarks === 'string' ? remarks : null,
      attachment_url: typeof attachment_url === 'string' ? attachment_url : null,
      status:         'pending',
      approver_id:    approverId,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[POST /api/leave/apply] Insert error:', insertError.message);
    return NextResponse.json(
      { data: null, error: 'Failed to create leave request' },
      { status: 500 },
    );
  }

  // ── 5. Best-effort approver email via Brevo (never fails the request) ───────
  if (approverId) {
    try {
      const [{ data: approver }, { data: employee }] = await Promise.all([
        supabaseAdmin.from('employees').select('full_name, email').eq('id', approverId).single(),
        supabaseAdmin.from('employees').select('full_name').eq('id', user.id).single(),
      ]);
      const approverRow = approver as { full_name: string; email: string } | null;
      const employeeRow = employee as { full_name: string } | null;
      if (approverRow?.email) {
        const { subject, htmlContent } = leaveRequestSubmittedEmail({
          approverName: approverRow.full_name,
          employeeName: employeeRow?.full_name ?? 'An employee',
          leaveType: leave_type as string,
          fromDate: from_date as string,
          toDate: to_date as string,
        });
        await sendEmail({ to: { email: approverRow.email, name: approverRow.full_name }, subject, htmlContent });
      }
    } catch (err) {
      console.error('[POST /api/leave/apply] Approver email failed:', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ data: leave as LeaveRequest, error: null }, { status: 200 });
}
