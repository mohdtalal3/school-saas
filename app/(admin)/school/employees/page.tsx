import { getSchoolSession } from "@/lib/auth/jwt";
import { EmployeeManagement } from "@/features/employees/employee-management";
import { requireModule } from "@/lib/module-access";
import { Suspense } from "react";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSchoolSession();
  if (!session?.schoolId) return null;
  const { tab } = await searchParams;
  await requireModule(session.schoolId, "employees", { tabParam: tab });
  return (
    <Suspense fallback={null}>
      <EmployeeManagement schoolId={session.schoolId} />
    </Suspense>
  );
}