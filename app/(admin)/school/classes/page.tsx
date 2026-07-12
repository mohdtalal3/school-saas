import { getSchoolSession } from "@/lib/auth/jwt";
import { ClassManagement } from "@/features/classes/class-management";

export default async function ClassesPage() {
  const session = await getSchoolSession();
  if (!session) return null;
  return <ClassManagement schoolId={session.schoolId} />;
}
