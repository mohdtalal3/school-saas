import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { TimetableManagement } from "@/features/timetable/timetable-management";
import { requireModule } from "@/lib/module-access";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin") redirect("/school-login");
  const { tab } = await searchParams;
  await requireModule(session.schoolId, "timetable", { tabParam: tab });
  return <Suspense fallback={null}><TimetableManagement schoolId={session.schoolId} /></Suspense>;
}
