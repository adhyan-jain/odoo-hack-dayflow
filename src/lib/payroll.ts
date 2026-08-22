/**
 * @file lib/payroll.ts
 * @what Statutory payroll breakdown calculator. Sums the employee's
 *       salary_components (Basic/HRA/Standard Allowance/Performance Bonus/
 *       LTA/Fixed Allowance/etc., each fixed-₹ or %-of-basic) into the
 *       wireframe's Salary Info breakdown, then applies statutory deductions
 *       hardcoded for the hackathon demo (see ARCHITECTURE.md §12 for what's
 *       faked). In production this would be replaced by a statutory-
 *       compliance engine and per-jurisdiction tax tables.
 * @exports computePayslip
 * @dependents app/api/payroll/slip/route.ts
 */

import type { SalaryRecord, SalaryComponent, PayslipBreakdown, PayslipComponentLine } from '@/lib/types';

/**
 * Computes the full salary slip breakdown for an employee given their
 * salary_records row, its salary_components rows, and the target month.
 *
 * Component resolution:
 *   fixed   -> value is already a ₹/month amount.
 *   percent -> value is a percentage (0-100) of basic_salary.
 *
 * Statutory rules applied (hardcoded, hackathon-appropriate):
 *   PF (employee) = 12% of basic_salary, deducted from net pay.
 *   PF (employer) = 12% of basic_salary, employer contribution — shown on
 *                   the slip for transparency but NOT subtracted from net.
 *   ESI = 0.75% of gross if gross < ₹21,000/month, else 0.
 *   PT  = ₹200 flat (Maharashtra slab, simplified demo constant).
 *   TDS = 10% of basic if basic > ₹50,000/month, else 0.
 *   Any salary_components row with category='deduction' also reduces net pay.
 *
 * @param salaryRecord  The salary_records row for this employee.
 * @param components    The salary_components rows tied to salaryRecord.id.
 * @param employeeId    UUID of the employee (for the response object).
 * @param month         "YYYY-MM" string for the pay period label.
 */
export function computePayslip(
  salaryRecord: SalaryRecord,
  components: SalaryComponent[],
  employeeId: string,
  month: string,
): PayslipBreakdown {
  const { basic_salary } = salaryRecord;

  const componentLines: PayslipComponentLine[] = components.map((c) => ({
    name: c.name,
    category: c.category,
    computationType: c.computation_type,
    value: c.value,
    monthlyAmount: c.computation_type === 'fixed' ? c.value : round2(basic_salary * (c.value / 100)),
  }));

  const earningsFromComponents = round2(
    componentLines.filter((c) => c.category === 'earning').reduce((sum, c) => sum + c.monthlyAmount, 0),
  );
  const componentDeductions = round2(
    componentLines.filter((c) => c.category === 'deduction').reduce((sum, c) => sum + c.monthlyAmount, 0),
  );

  // Fall back to the legacy flat columns when no components have been
  // configured yet (bitemporal rows written before this migration), so old
  // salary_records still produce a sane payslip instead of ₹0 gross.
  const hasComponents = components.length > 0;
  const hra = hasComponents ? 0 : salaryRecord.hra;
  const specialAllowance = hasComponents ? 0 : salaryRecord.special_allowance;
  const grossSalary = hasComponents
    ? round2(basic_salary + earningsFromComponents)
    : round2(basic_salary + hra + specialAllowance);

  // ── Statutory deductions ──────────────────────────────────────────────────
  const pfEmployee = round2(basic_salary * 0.12);
  const pfEmployer = round2(basic_salary * 0.12);
  const esi = grossSalary < 21_000 ? round2(grossSalary * 0.0075) : 0;
  const professionalTax = 200;
  const tds = basic_salary > 50_000 ? round2(basic_salary * 0.10) : 0;

  // otherDeductions = manual salary_records.deductions + any component-level
  // deduction rows (e.g. loan repayment configured as a salary component).
  const otherDeductions = round2(salaryRecord.deductions + componentDeductions);

  const totalDeductions = round2(pfEmployee + esi + professionalTax + tds + otherDeductions);
  const netSalary       = Math.max(0, round2(grossSalary - totalDeductions));

  return {
    employeeId,
    month,
    workingDaysPerWeek: salaryRecord.working_days_per_week,
    standardDailyHours: salaryRecord.standard_daily_hours,
    breakMinutes: salaryRecord.break_minutes,
    components: componentLines,
    basicSalary:      basic_salary,
    hra,
    specialAllowance,
    grossSalary,
    pfEmployee,
    pfEmployer,
    esi,
    professionalTax,
    tds,
    otherDeductions,
    totalDeductions,
    netSalary,
    netSalaryYearly: round2(netSalary * 12),
  };
}

/** Round to 2 decimal places (avoids floating-point drift in money math). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
