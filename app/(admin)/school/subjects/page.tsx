import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { SubjectManagement } from "@/features/subjects/subject-management";

export default async function SubjectsPage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin") redirect("/school-login");
  return <Suspense fallback={null}><SubjectManagement schoolId={session.schoolId} /></Suspense>;
}
