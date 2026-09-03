import { getSchoolSession } from "@/lib/auth/jwt";
import { StudentManagement } from "@/features/students/student-management";
import { requireModule } from "@/lib/module-access";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin" || !session.schoolId) {
    redirect("/school-login");
  }
  const { tab } = await searchParams;
  await requireModule(session.schoolId, "students", { tabParam: tab });
  return (
    <Suspense fallback={null}>
      <StudentManagement schoolId={session.schoolId} />
    </Suspense>
  );
}
