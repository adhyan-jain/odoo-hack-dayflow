export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Employee {id}</h1>
      {/* TODO: HR view/edit of a single employee's profile, attendance, leave, payroll */}
    </div>
  );
}
