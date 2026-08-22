/**
 * @file lib/permissions.ts
 * @what Single choke point for cross-employee access control. Every API route
 *       calls canAccess() before touching another employee's data. This is what
 *       makes RLS's flat (self/admin) model safe to pair with manager-level
 *       access — the graph resolution happens here, in one place, not ad hoc.
 * @exports canAccess, AccessResult, Resource, Action
 * @dependents app/api/leave/action, app/api/leave/check-coverage,
 *             app/api/payroll/slip, app/api/org/reportees
 *
 * See ARCHITECTURE.md §8 for the full permission model.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AccessResult, Resource, Action, UserRole } from '@/lib/types';

export type { AccessResult, Resource, Action };

/** Runtime guard narrowing an unknown value (e.g. a DB column read as
 * unknown, or a request-body field) to the UserRole domain type. */
export function isUserRole(value: unknown): value is UserRole {
  return value === 'employee' || value === 'hr' || value === 'admin';
}

/**
 * Determines whether `requestingUser` may perform `action` on `resource`
 * belonging to `targetEmployeeId`.
 *
 * Return values:
 *   'allow'         → full access, proceed normally
 *   'allow_partial' → limited access (e.g. manager sees net salary only)
 *   'deny'          → return 403 immediately
 */
export async function canAccess(
  requestingUser: { id: string; role: UserRole },
  targetEmployeeId: string,
  resource: Resource,
  action: Action,
): Promise<AccessResult> {

  // ── 1. Self access ──────────────────────────────────────────────────────────
  if (requestingUser.id === targetEmployeeId) {
    if (action === 'approve')                        return 'deny'; // no self-approval
    if (resource === 'payroll' && action !== 'read')  return 'deny';
    if (resource === 'org'    && action === 'write') return 'deny';
    return 'allow';
  }

  // ── 2. Admin — unrestricted access ─────────────────────────────────────────
  if (requestingUser.role === 'admin') {
    return 'allow';
  }

  // ── 3. HR — full access except salary write ─────────────────────────────────
  // ARCHITECTURE.md §8: "salary for hr: return allow_partial"
  // HR can read salary for payroll purposes, but not the full breakdown.
  if (requestingUser.role === 'hr') {
    if (resource === 'payroll') return 'allow_partial';
    return 'allow';
  }

  // ── 4. Manager path — resolve via reporting graph ──────────────────────────
  // supabaseAdmin is untyped; we cast the rpc result explicitly.
  const today = new Date().toISOString().slice(0, 10);

  const { data: rpcData, error } = await supabaseAdmin
    .rpc('get_reportees', { manager_uuid: requestingUser.id, as_of: today });

  if (error) {
    console.error('[canAccess] get_reportees RPC error:', error.message);
    return 'deny';
  }

  type ReporteeRow = { employee_id: string; depth: number };
  const reportees = (rpcData ?? []) as ReporteeRow[];

  const match = reportees.find((r) => r.employee_id === targetEmployeeId);
  if (!match) return 'deny';

  // ── 5. Target IS in the manager's tree ─────────────────────────────────────
  if (resource === 'payroll') {
    const { data: empData } = await supabaseAdmin
      .from('employees')
      .select('compensation_visibility')
      .eq('id', targetEmployeeId)
      .single();

    const emp = empData as { compensation_visibility: boolean } | null;
    return emp?.compensation_visibility ? 'allow' : 'allow_partial';
  }

  return 'allow';
}
