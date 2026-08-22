/**
 * @file app/api/org/reportees/route.ts
 * @what GET endpoint returning direct + indirect reports of the calling user.
 *       Used by the manager dashboard to scope their team view.
 * @exports GET
 * @dependents Frontend manager dashboard, team attendance/leave views
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ApiResponse, Employee } from '@/lib/types';

interface ReporteesResponse {
  asOf: string;
  reportees: Array<Employee & { depth: number }>;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ReporteesResponse>>> {
  // ── 1. Verify session ───────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse optional as_of param ──────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get('as_of') ?? new Date().toISOString().slice(0, 10);

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(asOf)) {
    return NextResponse.json(
      { data: null, error: 'as_of must be in YYYY-MM-DD format' },
      { status: 400 },
    );
  }

  // ── 3. Call get_reportees RPC ───────────────────────────────────────────────
  const { data: rpcData, error: rpcError } = await supabaseAdmin
    .rpc('get_reportees', { manager_uuid: user.id, as_of: asOf });

  if (rpcError) {
    console.error('[GET /api/org/reportees] RPC error:', rpcError.message);
    return NextResponse.json({ data: null, error: 'Failed to fetch reportees' }, { status: 500 });
  }

  type ReporteeRow = { employee_id: string; depth: number };
  const reporteeRows = (rpcData ?? []) as ReporteeRow[];

  if (reporteeRows.length === 0) {
    return NextResponse.json(
      { data: { asOf, reportees: [] }, error: null },
      { status: 200 },
    );
  }

  // ── 4. Enrich with employee profile data ────────────────────────────────────
  const reporteeIds = reporteeRows.map((r) => r.employee_id);

  const { data: empData, error: empError } = await supabaseAdmin
    .from('employees')
    .select('*')
    .in('id', reporteeIds);

  if (empError) {
    console.error('[GET /api/org/reportees] Employee fetch error:', empError.message);
    return NextResponse.json({ data: null, error: 'Failed to fetch employee profiles' }, { status: 500 });
  }

  const employees = (empData ?? []) as Employee[];
  const depthMap  = new Map<string, number>(reporteeRows.map((r) => [r.employee_id, r.depth]));

  const reportees: Array<Employee & { depth: number }> = employees.map((emp) => ({
    ...emp,
    depth: depthMap.get(emp.id) ?? 0,
  }));

  reportees.sort((a, b) => a.depth - b.depth || a.full_name.localeCompare(b.full_name));

  return NextResponse.json(
    { data: { asOf, reportees }, error: null },
    { status: 200 },
  );
}
