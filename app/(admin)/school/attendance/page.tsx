import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AttendanceManagement } from "@/features/attendance/attendance-management";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin") redirect("/school-login");
  if ((await searchParams).tab === "calendar") redirect("/school/settings/calendar");
  return <Suspense fallback={null}><AttendanceManagement schoolId={session.schoolId} /></Suspense>;
}
