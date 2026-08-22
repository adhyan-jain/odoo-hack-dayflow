/**
 * @file app/api/leave/action/route.ts
 * @what POST endpoint to approve or reject a leave request.
 *       Verifies the requesting user is the employee's manager OR admin/hr.
 *       If approving, runs the coverage check as a hard server-side gate.
 *       On approval: updates leave_requests, writes a consumption row to
 *       leave_balances (bitemporal deduction). See ARCHITECTURE.md §7.
 * @exports POST
 * @dependents Frontend manager approval queue (/leave/approvals page)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { canAccess } from '@/lib/permissions';
import { checkCoverage } from '@/lib/coverage';
import type { ApiResponse, LeaveRequest, Employee, TeamCoverageConfig } from '@/lib/types';

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<LeaveRequest>>> {
  // ── 1. Verify session ───────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse body ───────────────────────────────────────────────────────────
  let body: { leave_request_id?: unknown; action?: unknown; comments?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { leave_request_id, action, comments } = body;

  if (!leave_request_id || !action) {
    return NextResponse.json(
      { data: null, error: 'Missing required fields: leave_request_id, action' },
      { status: 400 },
    );
  }

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { data: null, error: 'action must be "approve" or "reject"' },
      { status: 400 },
    );
  }

  // ── 3. Load leave request and requesting user ───────────────────────────────
  // supabaseAdmin is untyped (see admin.ts for why); we cast results explicitly.
  const [leaveResult, requestorResult] = await Promise.all([
    supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', leave_request_id as string)
      .single(),
    supabaseAdmin
      .from('employees')
      .select('id, role')
      .eq('id', user.id)
      .single(),
  ]);

  if (leaveResult.error || !leaveResult.data) {
    return NextResponse.json({ data: null, error: 'Leave request not found' }, { status: 404 });
  }

  if (requestorResult.error || !requestorResult.data) {
    return NextResponse.json({ data: null, error: 'Requesting user profile not found' }, { status: 404 });
  }

  const leaveRequest   = leaveResult.data as LeaveRequest;
  const requestingUser = requestorResult.data as Pick<Employee, 'id' | 'role'>;

  // ── 4. Permission check ─────────────────────────────────────────────────────
  if (leaveRequest.status !== 'pending') {
    return NextResponse.json(
      { data: null, error: 'Leave request has already been processed' },
      { status: 400 },
    );
  }

  const access = await canAccess(
    requestingUser,
    leaveRequest.employee_id,
    'leave',
    'approve',
  );

  if (access === 'deny') {
    return NextResponse.json(
      { data: null, error: 'Forbidden: you are not the approver for this leave request' },
      { status: 403 },
    );
  }

  // ── 5. Coverage check (hard gate for approvals) ─────────────────────────────
  if (action === 'approve') {
    const { data: applicantData } = await supabaseAdmin
      .from('employees')
      .select('department')
      .eq('id', leaveRequest.employee_id)
      .single();

    const department = (applicantData as { department: string | null } | null)?.department;

    if (department) {
      // Get all employee IDs in this department first
      const { data: teamData } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('department', department);

      const teamIds = ((teamData ?? []) as { id: string }[]).map((e) => e.id);

      const [teamResult, approvedLeavesResult, configResult] = await Promise.all([
        supabaseAdmin.from('employees').select('*').eq('department', department),
        supabaseAdmin
          .from('leave_requests')
          .select('*')
          .eq('status', 'approved')
          .in('employee_id', teamIds),
        supabaseAdmin.from('team_coverage_config').select('*').eq('department', department),
      ]);

      const teamMembers    = (teamResult.data ?? []) as Employee[];
      const approvedLeaves = (approvedLeavesResult.data ?? []) as LeaveRequest[];
      const config         = (configResult.data ?? []) as TeamCoverageConfig[];

      const coverageResult = checkCoverage(
        teamMembers,
        approvedLeaves,
        { from: leaveRequest.start_date, to: leaveRequest.end_date },
        config,
        leaveRequest.employee_id,
      );

      if (!coverageResult.safe) {
        return NextResponse.json(
          {
            data:           null,
            error:          'Approval refused: coverage constraint violation',
            conflicts:      coverageResult.conflicts,
            suggestedDates: coverageResult.suggestedDates,
          } as ApiResponse<LeaveRequest> & { conflicts: unknown; suggestedDates: unknown },
          { status: 409 },
        );
      }
    }
  }

  // ── 6. Update the leave request ─────────────────────────────────────────────
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('leave_requests')
    .update({
      status:            action === 'approve' ? 'approved' : 'rejected',
      reviewed_by:       user.id,
      reviewed_at:       now,
      reviewer_comments: typeof comments === 'string' ? comments : null,
      updated_at:        now,
    })
    .eq('id', leave_request_id as string)
    .eq('status', 'pending')
    .select()
    .single();

  if (updateError) {
    console.error('[POST /api/leave/action] Update error:', updateError.message);
    return NextResponse.json(
      { data: null, error: 'Failed to update leave request' },
      { status: 500 },
    );
  }

  // ── 7. If approved: write leave_balances consumption row (bitemporal) ───────
  if (action === 'approve') {
    const start    = new Date(leaveRequest.start_date);
    const end      = new Date(leaveRequest.end_date);
    const leaveDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

    const { data: balanceData } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('employee_id', leaveRequest.employee_id)
      .eq('leave_type', leaveRequest.leave_type)
      .is('valid_to', null)
      .is('superseded_at', null)
      .single();

    if (balanceData) {
      const currentBalance = balanceData as { id: string; balance_days: number };
      await supabaseAdmin
        .from('leave_balances')
        .update({ valid_to: leaveRequest.start_date, superseded_at: now })
        .eq('id', currentBalance.id);

      const newBalance = Math.max(0, currentBalance.balance_days - leaveDays);

      await supabaseAdmin.from('leave_balances').insert({
        employee_id:   leaveRequest.employee_id,
        leave_type:    leaveRequest.leave_type,
        balance_days:  newBalance,
        reason:        'consumption',
        valid_from:    leaveRequest.start_date,
        valid_to:      null,
      });
    }
  }

  return NextResponse.json({ data: updated as LeaveRequest, error: null }, { status: 200 });
}
