import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AttendanceManagement } from "@/features/attendance/attendance-management";
import { requireModule } from "@/lib/module-access";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ tab?: string; view?: string }> }) {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin") redirect("/school-login");
  if (!session.schoolId) return null;
  const { tab, view } = await searchParams;
  if (tab === "calendar") redirect("/school/settings/calendar");
  if (tab === "employees") {
    await requireModule(session.schoolId, "attendance.employees", { tabParam: view });
  } else {
    await requireModule(session.schoolId, "attendance.students", { tabParam: tab });
  }
  return <Suspense fallback={null}><AttendanceManagement schoolId={session.schoolId} /></Suspense>;
}
