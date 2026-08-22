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
import type { ApiResponse, LeaveRequest, LeaveType } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<LeaveRequest>>> {
  // ── 1. Verify session ───────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse and validate body ──────────────────────────────────────────────
  let body: { leave_type?: unknown; from_date?: unknown; to_date?: unknown; remarks?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ data: null, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { leave_type, from_date, to_date, remarks } = body;

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
  const today_str = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: chainData } = await (supabaseAdmin as any)
    .rpc('get_manager_chain', { employee_uuid: user.id, as_of: today_str });

  const chain = chainData as Array<{ manager_id: string; depth: number }> | null;
  const directManager = chain?.find((m) => m.depth === 1);
  const approverId = directManager?.manager_id ?? null;

  // ── 4. Insert leave request ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leave, error: insertError } = await (supabaseAdmin as any)
    .from('leave_requests')
    .insert({
      employee_id:  user.id,
      leave_type:   leave_type as LeaveType,
      start_date:   from_date as string,
      end_date:     to_date as string,
      remarks:      typeof remarks === 'string' ? remarks : null,
      status:       'pending',
      approver_id:  approverId,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[POST /api/leave/apply] Insert error:', (insertError as Error).message);
    return NextResponse.json(
      { data: null, error: 'Failed to create leave request' },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: leave as LeaveRequest, error: null }, { status: 200 });
}
