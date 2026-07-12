import { getSchoolSession } from "@/lib/auth/jwt";
import { StudentManagement } from "@/features/students/student-management";
import { redirect } from "next/navigation";

export default async function StudentsPage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin" || !session.schoolId) {
    redirect("/school-login");
  }
  return <StudentManagement schoolId={session.schoolId} />;
}
