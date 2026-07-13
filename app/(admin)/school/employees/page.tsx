import { getSchoolSession } from "@/lib/auth/jwt";
import { EmployeeManagement } from "@/features/employees/employee-management";
import { Suspense } from "react";

export default async function EmployeesPage() {
  const session = await getSchoolSession();
  if (!session) return null;
  return (
    <Suspense fallback={null}>
      <EmployeeManagement schoolId={session.schoolId} />
    </Suspense>
  );
}