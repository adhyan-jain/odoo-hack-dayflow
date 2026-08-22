/**
 * @file app/api/org/rewind/route.ts
 * @what GET endpoint returning the full org tree as of a given date.
 *       Powers the time-travel org chart slider in the frontend.
 *       Business-time filtering only (valid_from/valid_to). See ARCHITECTURE.md §7.
 * @exports GET
 * @dependents Frontend /org page with the rewind date slider
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ApiResponse, OrgRewindResponse, OrgNode, UserRole } from '@/lib/types';

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<OrgRewindResponse>>> {
  // ── 1. Verify session ───────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse query param ────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get('as_of') ?? new Date().toISOString().slice(0, 10);

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(asOf)) {
    return NextResponse.json(
      { data: null, error: 'as_of must be in YYYY-MM-DD format' },
      { status: 400 },
    );
  }

  // ── 3. Fetch all reporting edges valid on `as_of` (business time) ───────────
  const [edgesResult, employeesResult] = await Promise.all([
    supabaseAdmin
      .from('reporting_edges')
      .select('employee_id, manager_id')
      .is('superseded_at', null)
      .lte('valid_from', asOf)
      .or(`valid_to.is.null,valid_to.gt.${asOf}`),
    supabaseAdmin
      .from('employees')
      .select('id, full_name, job_title, department, role'),
  ]);

  if (edgesResult.error) {
    console.error('[GET /api/org/rewind] Edges error:', edgesResult.error.message);
    return NextResponse.json({ data: null, error: 'Failed to fetch org data' }, { status: 500 });
  }

  type EdgeRow = { employee_id: string; manager_id: string };
  type EmpRow  = { id: string; full_name: string; job_title: string | null; department: string | null; role: string };

  const edges     = (edgesResult.data ?? []) as EdgeRow[];
  const employees = (employeesResult.data ?? []) as EmpRow[];

  // ── 4. Build flat employee map ──────────────────────────────────────────────
  const employeeMap: OrgRewindResponse['employees'] = {};
  for (const emp of employees) {
    employeeMap[emp.id] = {
      full_name:  emp.full_name,
      job_title:  emp.job_title,
      department: emp.department,
      role:       emp.role as UserRole,
    };
  }

  // ── 5. Assemble nested OrgNode tree ────────────────────────────────────────
  const childrenMap = new Map<string, string[]>();
  const hasManager  = new Set<string>();

  for (const edge of edges) {
    if (!childrenMap.has(edge.manager_id)) {
      childrenMap.set(edge.manager_id, []);
    }
    childrenMap.get(edge.manager_id)!.push(edge.employee_id);
    hasManager.add(edge.employee_id);
  }

  function buildNode(employeeId: string): OrgNode {
    const emp      = employeeMap[employeeId];
    const childIds = childrenMap.get(employeeId) ?? [];
    return {
      id:         employeeId,
      full_name:  emp?.full_name  ?? 'Unknown',
      job_title:  emp?.job_title  ?? null,
      department: emp?.department ?? null,
      role:       (emp?.role ?? 'employee') as UserRole,
      reports:    childIds.map(buildNode),
    };
  }

  const allEmployeeIds = new Set(employees.map((e) => e.id));
  const topLevelIds    = [...allEmployeeIds].filter((id) => !hasManager.has(id));
  const tree           = topLevelIds
    .filter((id) => childrenMap.has(id))
    .map(buildNode);

  const flatEdges = edges.map((e) => ({
    employeeId: e.employee_id,
    managerId:  e.manager_id,
  }));

  return NextResponse.json(
    { data: { date: asOf, tree, edges: flatEdges, employees: employeeMap }, error: null },
    { status: 200 },
  );
}
