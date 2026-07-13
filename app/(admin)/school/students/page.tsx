import { getSchoolSession } from "@/lib/auth/jwt";
import { StudentManagement } from "@/features/students/student-management";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function StudentsPage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin" || !session.schoolId) {
    redirect("/school-login");
  }
  return (
    <Suspense fallback={null}>
      <StudentManagement schoolId={session.schoolId} />
    </Suspense>
  );
}
