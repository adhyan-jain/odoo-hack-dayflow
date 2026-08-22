/**
 * @file lib/payroll.ts
 * @what Statutory payroll breakdown calculator. All formulas are hardcoded for
 *       the hackathon demo (see ARCHITECTURE.md §12 for what's faked).
 *       In production, this would be replaced by an integration with a
 *       statutory-compliance engine and per-jurisdiction tax tables.
 * @exports computePayslip
 * @dependents app/api/payroll/slip/route.ts
 */

import type { SalaryRecord, PayslipBreakdown } from '@/lib/types';

/**
 * Computes the full salary slip breakdown for an employee given their
 * salary_records row and the target month.
 *
 * Statutory rules applied (hardcoded, hackathon-appropriate):
 *   PF  = 12% of basic_salary (Provident Fund — standard Indian statutory)
 *   ESI = 0.75% of gross if gross < ₹21,000/month, else 0
 *         (Employee State Insurance — threshold per ESIC rules)
 *   PT  = ₹200 flat (Professional Tax — Maharashtra slab, max monthly PT)
 *   TDS = 10% of basic if basic > ₹50,000/month, else 0
 *         (Tax Deducted at Source — simplified flat rate for demo)
 *
 * @param salaryRecord  The salary_records row for this employee.
 * @param employeeId    UUID of the employee (for the response object).
 * @param month         "YYYY-MM" string for the pay period label.
 */
export function computePayslip(
  salaryRecord: SalaryRecord,
  employeeId: string,
  month: string,
): PayslipBreakdown {
  const { basic_salary, hra, special_allowance, deductions } = salaryRecord;

  const grossSalary = basic_salary + hra + special_allowance;

  // ── Statutory deductions ──────────────────────────────────────────────────
  // PF: 12% of basic. Applies to all employees regardless of salary level.
  const pf = round2(basic_salary * 0.12);

  // ESI: 0.75% of gross, but only if gross < ₹21,000. Above threshold, no ESI.
  // (Employer contributes 3.25%, but that's not shown on the employee slip.)
  const esi = grossSalary < 21_000 ? round2(grossSalary * 0.0075) : 0;

  // PT: Maharashtra Professional Tax — ₹200/month flat (simplified demo slab).
  // Real PT is ₹200 for gross > ₹10,000; ₹0 below. We always apply ₹200 here.
  const professionalTax = 200;

  // TDS: Simplified 10% of basic if basic > ₹50,000/month. In production this
  // would be calculated on annual CTC with applicable deductions per Form 16.
  const tds = basic_salary > 50_000 ? round2(basic_salary * 0.10) : 0;

  // otherDeductions comes from salary_records.deductions (manually set by HR,
  // e.g. loan repayment, advance recovery).
  const otherDeductions = deductions;

  const totalDeductions = pf + esi + professionalTax + tds + otherDeductions;
  const netSalary       = round2(grossSalary - totalDeductions);

  return {
    employeeId,
    month,
    basicSalary:      basic_salary,
    hra,
    specialAllowance: special_allowance,
    grossSalary:      round2(grossSalary),
    pf,
    esi,
    professionalTax,
    tds,
    otherDeductions,
    totalDeductions:  round2(totalDeductions),
    netSalary:        Math.max(0, netSalary), // clamp to 0 (edge case: heavy deductions)
  };
}

/** Round to 2 decimal places (avoids floating-point drift in money math). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
