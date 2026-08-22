/**
 * @file app/api/leave/check-coverage/route.ts
 * @what POST endpoint to run the coverage constraint algorithm before/at
 *       approval time. Advisory on the client side; hard gate server-side
 *       inside /api/leave/action. See ARCHITECTURE.md §7.
 * @exports POST
 * @dependents Frontend leave approval UI (pre-approval advisory call)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkCoverage } from '@/lib/coverage';
import type { ApiResponse, CoverageResult, Employee, LeaveRequest, TeamCoverageConfig } from '@/lib/types';

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<CoverageResult>>> {
  // ── 1. Verify session ───────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse body ───────────────────────────────────────────────────────────
  let body: {
    from_date?: unknown;
    to_date?: unknown;
    requesting_employee_id?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { from_date, to_date, requesting_employee_id } = body;

  if (!from_date || !to_date || !requesting_employee_id) {
    return NextResponse.json(
      { data: null, error: 'Missing required fields: from_date, to_date, requesting_employee_id' },
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

  // ── 3. Fetch applicant's department ─────────────────────────────────────────
  const { data: applicantData, error: applicantError } = await supabaseAdmin
    .from('employees')
    .select('id, department')
    .eq('id', requesting_employee_id as string)
    .single();

  if (applicantError || !applicantData) {
    return NextResponse.json({ data: null, error: 'Employee not found' }, { status: 404 });
  }

  const applicant   = applicantData as { id: string; department: string | null };
  const department  = applicant.department;

  if (!department) {
    return NextResponse.json(
      { data: { safe: true, conflicts: [], suggestedDates: [] }, error: null },
      { status: 200 },
    );
  }

  // ── 4. Fetch team data ──────────────────────────────────────────────────────
  const [teamResult, configResult] = await Promise.all([
    supabaseAdmin.from('employees').select('*').eq('department', department),
    supabaseAdmin.from('team_coverage_config').select('*').eq('department', department),
  ]);

  const teamMemberIds = ((teamResult.data ?? []) as { id: string }[]).map((e) => e.id);

  const approvedLeavesResult = await supabaseAdmin
    .from('leave_requests')
    .select('*')
    .eq('status', 'approved')
    .in('employee_id', teamMemberIds)
    .lte('start_date', to_date as string)
    .gte('end_date', from_date as string);

  const teamMembers    = (teamResult.data ?? []) as Employee[];
  const approvedLeaves = (approvedLeavesResult.data ?? []) as LeaveRequest[];
  const config         = (configResult.data ?? []) as TeamCoverageConfig[];

  // ── 5. Run coverage algorithm ───────────────────────────────────────────────
  const result = checkCoverage(
    teamMembers,
    approvedLeaves,
    { from: new Date(from_date as string), to: new Date(to_date as string) },
    config,
    requesting_employee_id as string,
  );

  return NextResponse.json({ data: result, error: null }, { status: 200 });
}
