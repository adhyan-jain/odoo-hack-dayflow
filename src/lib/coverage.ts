/**
 * @file lib/coverage.ts
 * @what Coverage constraint algorithm, extracted from the API route so it can
 *       be unit tested in isolation. Called by POST /api/leave/check-coverage
 *       (advisory, pre-approval UI) and POST /api/leave/action (hard gate,
 *       server-side enforced). See ARCHITECTURE.md §7 and §10.
 * @exports checkCoverage, suggestAlternativeDates
 * @dependents app/api/leave/check-coverage/route.ts,
 *             app/api/leave/action/route.ts
 */

import type {
  Employee,
  LeaveRequest,
  TeamCoverageConfig,
  CoverageResult,
  CoverageBreach,
  DateRange,
} from '@/lib/types';

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Returns an array of every date (as "YYYY-MM-DD" strings) in [from, to] inclusive. */
function eachDayInRange(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Returns true if a leave request's date range overlaps with a given day. */
function leaveOverlapsDay(leave: LeaveRequest, day: string): boolean {
  return leave.start_date <= day && leave.end_date >= day;
}

// ── Main exports ──────────────────────────────────────────────────────────────

/**
 * Checks whether approving leave for ONE employee over [from, to] would
 * violate coverage constraints for their department.
 *
 * Logic (from ARCHITECTURE.md §7):
 *   For each day in the range:
 *     already_on_leave = count of team members with an APPROVED leave overlapping that day
 *     available_after_approval = total_headcount - already_on_leave - 1 (the requester)
 *     if available_after_approval < min_headcount_required → breach
 *
 * @param teamMembers      All employees in the same department as the requester
 *                         (including the requester themselves).
 * @param approvedLeaves   All APPROVED leave requests for those team members.
 * @param requestedRange   The leave range being evaluated.
 * @param config           Coverage config rows — pass all rows, function filters
 *                         by department automatically.
 * @param requestingEmployeeId  The employee applying for leave (excluded from headcount).
 */
export function checkCoverage(
  teamMembers: Employee[],
  approvedLeaves: LeaveRequest[],
  requestedRange: DateRange,
  config: TeamCoverageConfig[],
  requestingEmployeeId: string,
): CoverageResult {
  if (teamMembers.length === 0) {
    // Fail closed: if no team data is found, it's unsafe to evaluate coverage
    return {
      safe: false,
      conflicts: [
        {
          date: 'unknown',
          availableAfterApproval: 0,
          minRequired: 1,
        },
      ],
      suggestedDates: [],
    };
  }

  // Find the department config. If no config exists, no coverage constraint applies.
  const department = teamMembers.find((e) => e.id === requestingEmployeeId)?.department;
  const deptConfig = config.find((c) => c.department === department);

  if (!deptConfig) {
    return { safe: true, conflicts: [], suggestedDates: [] };
  }

  const minRequired   = deptConfig.min_headcount_required;
  const totalHeadcount = teamMembers.length;
  const days = eachDayInRange(new Date(requestedRange.from), new Date(requestedRange.to));
  const conflicts: CoverageBreach[] = [];

  for (const day of days) {
    // Count team members (excluding the requester) who already have approved leave on this day
    const alreadyOnLeave = approvedLeaves.filter(
      (lr) =>
        lr.employee_id !== requestingEmployeeId &&
        lr.status === 'approved' &&
        leaveOverlapsDay(lr, day),
    ).length;

    // -1 for the requester themselves being absent if approved
    const availableAfterApproval = totalHeadcount - alreadyOnLeave - 1;

    if (availableAfterApproval < minRequired) {
      conflicts.push({
        date: day,
        availableAfterApproval,
        minRequired,
      });
    }
  }

  const safe = conflicts.length === 0;

  // Only compute suggestions if there are conflicts
  const suggestedDates = safe
    ? []
    : suggestAlternativeDates(
        teamMembers,
        approvedLeaves,
        days.length, // same duration as the requested range
        config,
        14,
        requestingEmployeeId,
        requestedRange.to, // start looking forward from the end of the requested range
      );

  return { safe, conflicts, suggestedDates };
}

/**
 * Looks forward `lookAheadDays` from `startSearchFrom` to find windows of
 * `requestedDuration` consecutive days that satisfy coverage constraints.
 *
 * Returns up to 3 alternative date ranges for the UX to present.
 */
export function suggestAlternativeDates(
  teamMembers: Employee[],
  approvedLeaves: LeaveRequest[],
  requestedDuration: number,
  config: TeamCoverageConfig[],
  lookAheadDays: number = 14,
  requestingEmployeeId: string,
  startSearchFrom: Date | string = new Date(),
): DateRange[] {
  const department = teamMembers.find((e) => e.id === requestingEmployeeId)?.department;
  const deptConfig = config.find((c) => c.department === department);
  if (!deptConfig) return [];

  const minRequired    = deptConfig.min_headcount_required;
  const totalHeadcount = teamMembers.length;

  // Build the search window: from tomorrow up to lookAheadDays days
  const searchStart = new Date(startSearchFrom);
  searchStart.setUTCDate(searchStart.getUTCDate() + 1);
  searchStart.setUTCHours(0, 0, 0, 0);

  const searchEnd = new Date(searchStart);
  searchEnd.setUTCDate(searchEnd.getUTCDate() + lookAheadDays);

  const searchDays = eachDayInRange(searchStart, searchEnd);
  const suggestions: DateRange[] = [];

  // Slide a window of `requestedDuration` days across the search range
  for (let i = 0; i <= searchDays.length - requestedDuration; i++) {
    const windowDays = searchDays.slice(i, i + requestedDuration);
    const windowBreaches = windowDays.filter((day) => {
      const alreadyOnLeave = approvedLeaves.filter(
        (lr) =>
          lr.employee_id !== requestingEmployeeId &&
          lr.status === 'approved' &&
          leaveOverlapsDay(lr, day),
      ).length;
      return totalHeadcount - alreadyOnLeave - 1 < minRequired;
    });

    if (windowBreaches.length === 0) {
      suggestions.push({
        from: windowDays[0],
        to:   windowDays[windowDays.length - 1],
      });

      // Return up to 3 suggestions
      if (suggestions.length >= 3) break;

      // Jump forward past this window to avoid overlapping suggestions
      i += requestedDuration - 1;
    }
  }

  return suggestions;
}
