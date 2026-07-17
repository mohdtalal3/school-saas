"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { SubjectCatalogTab } from "./subject-catalog-tab";
import { AssignSubjectsTab } from "./assign-subjects-tab";

export function SubjectManagement({ schoolId }: { schoolId: string }) {
  const tab = useSearchParams().get("tab") ?? "create";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {tab === "create" && <SubjectCatalogTab schoolId={schoolId} />}
      {tab === "assign" && <AssignSubjectsTab schoolId={schoolId} />}
    </motion.div>
  );
}
