/**
 * @file types/database.types.ts
 * @what Re-exports from the canonical types source (lib/types.ts).
 *       Kept for backward compatibility with existing supabase client files
 *       that import `Database` from this path.
 * @deprecated Import directly from '@/lib/types' instead.
 */

export type { Database, UserRole, AttendanceStatus, LeaveType, LeaveStatus } from '@/lib/types';
