import { getSchoolSession } from "@/lib/auth/jwt";
import { ClassManagement } from "@/features/classes/class-management";
import { requireModule } from "@/lib/module-access";

export default async function ClassesPage() {
  const session = await getSchoolSession();
  if (!session?.schoolId) return null;
  await requireModule(session.schoolId, "classes");
  return <ClassManagement schoolId={session.schoolId} />;
}
