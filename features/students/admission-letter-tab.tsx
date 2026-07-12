"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchPicker } from "@/components/ui/search-picker";
import type { StudentWithClass } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

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
  const [selected, setSelected] = React.useState<{ id: string; name: string; photo_url: string | null; registration_no: string | null; class_name: string | null } | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SearchPicker
        placeholder="Type at least 3 letters to search students..."
        searchFn={(q) => searchStudents(schoolId, q)}
        queryKey={(q) => ["students-search", schoolId, q] as const}
        emptyHint={{
          icon: <FileText className="h-7 w-7 text-muted-foreground" />,
          title: "Search for a student",
          description: "Type at least 3 letters of their name, reg no, or father's name. Then click to print their admission letter.",
        }}
        onSelect={(item) =>
          setSelected({
            id: item.id,
            name: item.name,
            photo_url: item.photo_url ?? null,
            registration_no: item.subtitle?.split(" · ")[0] ?? null,
            class_name: item.subtitle?.split(" · ")[1] ?? null,
          })
        }
      />

      {selected && (
        <Card className="mx-auto max-w-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {selected.photo_url && (
                  <AvatarImage src={selected.photo_url} alt={selected.name} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {getInitials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-sm font-semibold">
                  {selected.name}
                </CardTitle>
                <p className="truncate text-xs text-muted-foreground">
                  {selected.registration_no}
                  {selected.class_name && ` · ${selected.class_name}`}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="w-full gap-2">
              <a
                href={`/school/students/admission-letter/${selected.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-3.5 w-3.5" />
                Print Admission Letter
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
