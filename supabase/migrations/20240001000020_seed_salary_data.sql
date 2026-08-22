-- =============================================================================
-- Migration 020: seed default salary data for employees missing a current record
-- =============================================================================
-- What: /api/payroll/slip 404s with "No salary record found" for any employee
--       who has never had a salary_records row created (get_salary_at() finds
--       nothing to return). This backfills a default current salary_records +
--       matching salary_components breakdown for every such employee, so
--       payroll works out of the box for demo/dev without hand-written SQL
--       per employee.
--
--       Idempotent and non-destructive: only inserts for employees with no
--       CURRENT record (valid_to IS NULL AND superseded_at IS NULL). Employees
--       that already have a current salary_records row are left untouched.
--       Safe to re-run after new employees are created — it will only seed
--       the new ones.
--
-- Depends on: 20240001000001_employees.sql, 20240001000003_salary_records.sql,
--             20240001000013_salary_components.sql
-- =============================================================================

do $$
declare
  emp record;
  new_record_id uuid;
begin
  for emp in
    select e.id
    from public.employees e
    where not exists (
      select 1
      from public.salary_records sr
      where sr.employee_id = e.id
        and sr.valid_to is null
        and sr.superseded_at is null
    )
  loop
    insert into public.salary_records (
      employee_id, basic_salary, hra, special_allowance, deductions, valid_from
    )
    values (
      emp.id, 50000, 20000, 5000, 0, current_date
    )
    returning id into new_record_id;

    insert into public.salary_components (
      salary_record_id, employee_id, name, category, computation_type, value
    )
    values
      (new_record_id, emp.id, 'Basic',                 'earning',   'fixed', 50000),
      (new_record_id, emp.id, 'House Rent Allowance',   'earning',   'fixed', 20000),
      (new_record_id, emp.id, 'Standard Allowance',     'earning',   'fixed',  5000),
      (new_record_id, emp.id, 'Professional Tax',       'deduction', 'fixed',   200);
  end loop;
end $$;
