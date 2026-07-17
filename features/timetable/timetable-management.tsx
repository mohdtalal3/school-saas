"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { WeekdaysTab } from "./weekdays-tab";
import { TimePeriodsTab } from "./time-periods-tab";
import { TimetableBuilderTab } from "./timetable-builder-tab";
import { TimetablePreviewTab } from "./timetable-preview-tab";

export function TimetableManagement({ schoolId }: { schoolId: string }) {
  const tab = useSearchParams().get("tab") ?? "weekdays";
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    {tab === "weekdays" && <WeekdaysTab schoolId={schoolId} />}
    {tab === "periods" && <TimePeriodsTab schoolId={schoolId} />}
    {tab === "create" && <TimetableBuilderTab schoolId={schoolId} />}
    {tab === "preview" && <TimetablePreviewTab schoolId={schoolId} />}
  </motion.div>;
}
