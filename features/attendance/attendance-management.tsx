"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { DailyStudentAttendanceTab } from "./daily-student-attendance-tab";
import { StudentAttendanceReportTab } from "./student-attendance-report-tab";
import { ClassAttendanceReportTab } from "./class-attendance-report-tab";

export function AttendanceManagement({ schoolId }: { schoolId: string }) {
  const tab = useSearchParams().get("tab") ?? "students";
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    {tab === "students" && <DailyStudentAttendanceTab schoolId={schoolId} />}
    {tab === "student-report" && <StudentAttendanceReportTab schoolId={schoolId} />}
    {tab === "class-report" && <ClassAttendanceReportTab schoolId={schoolId} />}
  </motion.div>;
}
