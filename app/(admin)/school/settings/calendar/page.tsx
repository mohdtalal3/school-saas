import { redirect } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { AttendanceCalendarTab } from "@/features/attendance/attendance-calendar-tab";

export default async function CalendarSettingsPage() {
  const session = await getSchoolSession();
  if (!session || session.role !== "admin") redirect("/school-login");
  return <AttendanceCalendarTab schoolId={session.schoolId} />;
}
