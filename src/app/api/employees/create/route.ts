/**
 * @file app/api/employees/create/route.ts
 * @what POST endpoint for Admin/HR to provision a new employee (wireframe:
 *       Employees page "NEW" button). Employees never self-register — see
 *       ARCHITECTURE-reconciliation §1. This route:
 *         1. Creates the auth.users row via the Admin Auth API (service role),
 *            which fires handle_new_user() and inserts a default employees
 *            row (role='employee', employee_code='EMP-xxxx').
 *         2. Generates a wireframe-format login_id via generate_login_id()
 *            and a random temporary password.
 *         3. Updates the employees row with login_id, must_change_password,
 *            full_name, department, job_title, date_of_joining.
 *       The temp password is returned once in the response so the admin can
 *       hand it to the new employee — it is never stored in plaintext.
 * @exports POST
 * @dependents Employees page "NEW" create-employee modal
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isUserRole } from '@/lib/permissions';
import { sendEmail } from '@/lib/email/mailer';
import { welcomeEmployeeEmail } from '@/lib/email/templates';
import type { ApiResponse, Employee, UserRole } from '@/lib/types';

interface CreateEmployeeResponse {
  employee: Employee;
  temporaryPassword: string;
}

function generateTemporaryPassword(): string {
  // 12 random alphanumeric chars — first-login-only, employee must change it
  // immediately (must_change_password gate in the Security tab / proxy).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<CreateEmployeeResponse>>> {
  // ── 1. Verify session + admin/hr role ───────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: requesterData, error: requesterError } = await supabaseAdmin
    .from('employees')
    .select('role')
    .eq('id', user.id)
    .single();

  if (
    requesterError ||
    !requesterData ||
    typeof requesterData !== 'object' ||
    !('role' in requesterData) ||
    !isUserRole(requesterData.role)
  ) {
    return NextResponse.json({ data: null, error: 'Employee profile not found' }, { status: 404 });
  }

  const requesterRole = requesterData.role;
  if (requesterRole !== 'admin' && requesterRole !== 'hr') {
    return NextResponse.json({ data: null, error: 'Forbidden: admin or hr only' }, { status: 403 });
  }

  // ── 2. Parse and validate body ──────────────────────────────────────────────
  let body: {
    full_name?: unknown;
    email?: unknown;
    phone?: unknown;
    department?: unknown;
    job_title?: unknown;
    date_of_joining?: unknown;
    role?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { full_name, email, phone, department, job_title, date_of_joining } = body;

  if (typeof full_name !== 'string' || full_name.trim().split(/\s+/).length < 1 || !full_name.trim()) {
    return NextResponse.json({ data: null, error: 'full_name is required' }, { status: 400 });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ data: null, error: 'A valid email is required' }, { status: 400 });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const joinDate = typeof date_of_joining === 'string' && dateRegex.test(date_of_joining)
    ? date_of_joining
    : new Date().toISOString().slice(0, 10);
  const joinYear = Number(joinDate.slice(0, 4));

  // Only admin/hr may promote; never trust a client-supplied 'admin' unless
  // the requester is themself an admin (HR cannot mint new admins/hr).
  const requestedRole: UserRole = body.role === 'hr' || body.role === 'admin' ? body.role : 'employee';
  if ((requestedRole === 'admin' || requestedRole === 'hr') && requesterRole !== 'admin') {
    return NextResponse.json({ data: null, error: 'Forbidden: only admin can assign hr/admin roles' }, { status: 403 });
  }

  const temporaryPassword = generateTemporaryPassword();

  // ── 3. Create the auth.users row (fires handle_new_user trigger) ────────────
  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createUserError || !createdUser.user) {
    return NextResponse.json(
      { data: null, error: createUserError?.message ?? 'Failed to create auth user' },
      { status: 400 },
    );
  }

  // ── 4. Generate the wireframe-format login_id ───────────────────────────────
  const { data: loginIdData, error: loginIdError } = await supabaseAdmin
    .rpc('generate_login_id', { p_full_name: full_name, p_join_year: joinYear });

  if (loginIdError || typeof loginIdData !== 'string') {
    // Roll back the just-created auth user so retries don't leave orphans.
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ data: null, error: 'Failed to generate login_id' }, { status: 500 });
  }


  // ── 5. Backfill the employees row created by handle_new_user ────────────────
  const { data: updatedEmployee, error: updateError } = await supabaseAdmin
    .from('employees')
    .update({
      login_id: loginIdData,
      must_change_password: true,
      full_name,
      phone: typeof phone === 'string' ? phone : null,
      department: typeof department === 'string' ? department : null,
      job_title: typeof job_title === 'string' ? job_title : null,
      date_of_joining: joinDate,
      role: requestedRole,
    })
    .eq('id', createdUser.user.id)
    .select()
    .single();

  if (updateError || !updatedEmployee) {
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ data: null, error: 'Failed to finalize employee profile' }, { status: 500 });
  }

  // ── 6. Best-effort welcome email via Brevo (never fails the request) ────────
  try {
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('name')
      .single();
    const { subject, htmlContent } = welcomeEmployeeEmail({
      fullName: full_name,
      companyName: (companySettings as { name?: string } | null)?.name ?? 'Dayflow',
      loginId: loginIdData,
      temporaryPassword,
      signInUrl: `${request.nextUrl.origin}/sign-in`,
    });
    await sendEmail({ to: { email, name: full_name }, subject, htmlContent });
  } catch (err) {
    console.error('[POST /api/employees/create] Welcome email failed:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json(
    { data: { employee: updatedEmployee as Employee, temporaryPassword }, error: null },
    { status: 200 },
  );
}
