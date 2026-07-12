import { getSchoolSession } from "@/lib/auth/jwt";
import { EmployeeManagement } from "@/features/employees/employee-management";

export default async function EmployeesPage() {
  const session = await getSchoolSession();
  if (!session) return null;
  return <EmployeeManagement schoolId={session.schoolId} />;
}