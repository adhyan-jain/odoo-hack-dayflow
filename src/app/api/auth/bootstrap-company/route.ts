/**
 * @file app/api/auth/bootstrap-company/route.ts
 * @what POST endpoint backing the wireframe's Sign Up screen, which is
 *       company/admin onboarding — NOT employee self-registration (see
 *       ARCHITECTURE-reconciliation §1). Creates the company_settings
 *       singleton row plus the very first admin account, atomically:
 *         1. Reject if a company already exists (company_exists()).
 *         2. Create the auth.users row (fires handle_new_user -> default
 *            employees row with role='employee').
 *         3. Promote that row to role='admin', must_change_password=false
 *            (the admin picked their own password at signup — no forced
 *            change, unlike HR/Admin-provisioned employees).
 *         4. Optionally upload the provided logo to the company-assets
 *            bucket and insert the company_settings row.
 *       Any failure after user creation rolls the auth user back so retries
 *       don't leave a half-provisioned account.
 * @exports POST
 * @dependents AuthView (sign-up mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ApiResponse, Employee } from '@/lib/types';

interface BootstrapCompanyResponse {
  employee: Employee;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<BootstrapCompanyResponse>>> {
  // ── 1. Parse and validate body ──────────────────────────────────────────────
  let body: {
    company_name?: unknown;
    full_name?: unknown;
    email?: unknown;
    password?: unknown;
    logo_base64?: unknown;
    logo_content_type?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { company_name, full_name, email, password, logo_base64, logo_content_type } = body;

  if (typeof company_name !== 'string' || !company_name.trim()) {
    return NextResponse.json({ data: null, error: 'company_name is required' }, { status: 400 });
  }
  if (typeof full_name !== 'string' || !full_name.trim()) {
    return NextResponse.json({ data: null, error: 'full_name is required' }, { status: 400 });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ data: null, error: 'A valid email is required' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ data: null, error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  // ── 2. Reject if a company already exists — single-tenant HRMS ──────────────
  const { data: companyExists, error: existsError } = await supabaseAdmin.rpc('company_exists');
  if (existsError) {
    console.error('[POST /api/auth/bootstrap-company] company_exists RPC error:', existsError.message);
    return NextResponse.json({ data: null, error: 'Failed to check company state' }, { status: 500 });
  }
  if (companyExists) {
    return NextResponse.json(
      { data: null, error: 'A company is already registered. Please sign in instead.' },
      { status: 409 },
    );
  }

  // ── 3. Create the admin's auth.users row (fires handle_new_user trigger) ────
  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createUserError || !createdUser.user) {
    return NextResponse.json(
      { data: null, error: createUserError?.message ?? 'Failed to create account' },
      { status: 400 },
    );
  }

  // ── 4. Promote to admin, no forced password change (they chose it themselves) ──
  const { data: updatedEmployee, error: updateError } = await supabaseAdmin
    .from('employees')
    .update({ role: 'admin', full_name, must_change_password: false })
    .eq('id', createdUser.user.id)
    .select()
    .single();

  if (updateError || !updatedEmployee) {
    console.error('[POST /api/auth/bootstrap-company] promote-to-admin error:', updateError?.message);
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ data: null, error: 'Failed to finalize admin profile' }, { status: 500 });
  }

  // ── 5. Optional logo upload ──────────────────────────────────────────────────
  let logoUrl: string | null = null;
  if (typeof logo_base64 === 'string' && logo_base64.length > 0) {
    const contentType = typeof logo_content_type === 'string' ? logo_content_type : 'image/png';
    const bytes = Buffer.from(logo_base64, 'base64');

    if (bytes.byteLength > MAX_LOGO_BYTES) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
      return NextResponse.json({ data: null, error: 'Logo must be under 2MB' }, { status: 400 });
    }

    const extension = contentType.split('/')[1] ?? 'png';
    const path = `logo.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('company-assets')
      .upload(path, bytes, { contentType, upsert: true });

    if (uploadError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
      return NextResponse.json({ data: null, error: 'Failed to upload logo' }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('company-assets').getPublicUrl(path);
    logoUrl = publicUrlData.publicUrl;
  }

  const { error: settingsError } = await supabaseAdmin
    .from('company_settings')
    .insert({ id: true, name: company_name, logo_url: logoUrl });

  if (settingsError) {
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ data: null, error: 'Failed to save company settings' }, { status: 500 });
  }

  return NextResponse.json({ data: { employee: updatedEmployee as Employee }, error: null }, { status: 200 });
}
