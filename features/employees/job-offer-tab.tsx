"use client";

import { FileText } from "lucide-react";
import { LetterSearchTab } from "@/components/ui/letter-search-tab";
import type { Employee } from "@/types/school.types";

async function searchEmployees(
  schoolId: string,
  query: string
): Promise<{ id: string; name: string; photo_url?: string | null; subtitle?: string }[]> {
  const qs = new URLSearchParams({ page: "1", limit: "20", search: query });
  const res = await fetch(`/api/employees/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return (json.data.data as Employee[]).map((e) => ({
    id: e.id,
    name: e.name,
    photo_url: e.photo_url,
    subtitle: `${e.role}${e.employee_code ? ` · ${e.employee_code}` : ""}`,
  }));
}

interface JobOfferTabProps {
  schoolId: string;
}

export function JobOfferTab({ schoolId }: JobOfferTabProps) {
  return (
    <LetterSearchTab
      title="Job Offer Letter"
      icon={FileText}
      searchPlaceholder="Type at least 3 letters to search employees..."
      searchFn={(q) => searchEmployees(schoolId, q)}
      queryKey={(q) => ["employees-search", schoolId, q] as const}
      emptyHintTitle="Search for an employee"
      emptyHintDescription="Type at least 3 letters of their name, role, or code. Then click to print their offer letter."
      printLabel="Print Offer Letter"
      printHref={(id) => `/school/employees/offer-letter/${id}`}
    />
  );
}
