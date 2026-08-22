/**
 * @file app/api/payroll/slip/route.ts
 * @what GET endpoint returning a computed salary slip for an employee.
 *       Respects allow_partial for managers (net total only, no breakdown).
 *       Admin/HR get full breakdown. Employees get their own full breakdown.
 * @exports GET
 * @dependents Frontend /payroll page
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { canAccess } from '@/lib/permissions';
import { computePayslip } from '@/lib/payroll';
import type { ApiResponse, Employee, SalaryRecord, PayslipBreakdown } from '@/lib/types';

type SlipResponse = PayslipBreakdown | { employeeId: string; month: string; netSalary: number };

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SlipResponse>>> {
  // ── 1. Verify session ───────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse query params ───────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const targetEmployeeId = searchParams.get('employee_id') ?? user.id;
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);

  const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!monthRegex.test(month)) {
    return NextResponse.json(
      { data: null, error: 'month must be in YYYY-MM format with valid month range 01-12' },
      { status: 400 },
    );
  }

  // ── 3. Load requesting user's employee record ───────────────────────────────
  const { data: reqEmpData, error: empError } = await supabaseAdmin
    .from('employees')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (empError || !reqEmpData) {
    return NextResponse.json({ data: null, error: 'Employee profile not found' }, { status: 404 });
  }

  const requestingEmployee = reqEmpData as Pick<Employee, 'id' | 'role'>;

  // ── 4. Permission check ─────────────────────────────────────────────────────
  const access = await canAccess(
    requestingEmployee,
    targetEmployeeId,
    'payroll',
    'read',
  );

  if (access === 'deny') {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
  }

  // ── 5. Fetch salary record valid for the requested month ────────────────────
  const [year, mon] = month.split('-').map(Number);
  const monthEnd = new Date(year, mon, 0).toISOString().slice(0, 10); // last day of month

  const { data: salaryData, error: salaryError } = await supabaseAdmin
    .rpc('get_salary_at', { employee_uuid: targetEmployeeId, as_of: monthEnd });

  if (salaryError) {
    console.error('[GET /api/payroll/slip] Salary RPC error:', salaryError.message);
    return NextResponse.json({ data: null, error: 'Failed to fetch salary data' }, { status: 500 });
  }

  type SalaryRows = SalaryRecord[];
  const salaryRows = (salaryData ?? []) as SalaryRows;
  const salaryRecord = salaryRows[0];

  if (!salaryRecord) {
    return NextResponse.json(
      { data: null, error: `No salary record found for employee ${targetEmployeeId} in ${month}` },
      { status: 404 },
    );
  }

  // ── 6. Compute and return payslip ───────────────────────────────────────────
  const breakdown = computePayslip(salaryRecord, targetEmployeeId, month);

  if (access === 'allow_partial') {
    return NextResponse.json(
      {
        data: {
          employeeId: breakdown.employeeId,
          month:      breakdown.month,
          netSalary:  breakdown.netSalary,
        },
        error: null,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ data: breakdown, error: null }, { status: 200 });
}
