"use client";

import { FileText } from "lucide-react";
import { LetterSearchTab } from "@/components/ui/letter-search-tab";
import type { StudentWithClass } from "@/types/school.types";

async function searchStudents(
  schoolId: string,
  query: string
): Promise<{ id: string; name: string; photo_url?: string | null; subtitle?: string }[]> {
  const qs = new URLSearchParams({ page: "1", limit: "20", search: query });
  const res = await fetch(`/api/students/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return (json.data.data as StudentWithClass[]).map((s) => ({
    id: s.id,
    name: s.name,
    photo_url: s.photo_url,
    subtitle: `${s.registration_no ?? "No Reg"}${s.class_name ? ` · ${s.class_name}` : ""}`,
  }));
}

interface AdmissionLetterTabProps {
  schoolId: string;
}

export function AdmissionLetterTab({ schoolId }: AdmissionLetterTabProps) {
  return (
    <LetterSearchTab
      title="Admission Letter"
      icon={FileText}
      searchPlaceholder="Type at least 3 letters to search students..."
      searchFn={(q) => searchStudents(schoolId, q)}
      queryKey={(q) => ["students-search", schoolId, q] as const}
      emptyHintTitle="Search for a student"
      emptyHintDescription="Type at least 3 letters of their name, reg no, or father's name. Then click to print their admission letter."
      printLabel="Print Admission Letter"
      printHref={(id) => `/school/students/admission-letter/${id}`}
    />
  );
}
