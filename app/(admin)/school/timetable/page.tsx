import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { TimetableManagement } from "@/features/timetable/timetable-management";

export default async function TimetablePage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin") redirect("/school-login");
  return <Suspense fallback={null}><TimetableManagement schoolId={session.schoolId} /></Suspense>;
}
