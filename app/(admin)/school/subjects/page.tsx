import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { SubjectManagement } from "@/features/subjects/subject-management";
import { requireModule } from "@/lib/module-access";

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin") redirect("/school-login");
  const { tab } = await searchParams;
  await requireModule(session.schoolId, "subjects", { tabParam: tab });
  return <Suspense fallback={null}><SubjectManagement schoolId={session.schoolId} /></Suspense>;
}
