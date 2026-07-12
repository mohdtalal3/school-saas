"use client";

import * as React from "react";
import { CreditCard, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchPicker } from "@/components/ui/search-picker";
import type { Employee } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

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

interface IdCardsTabProps {
  schoolId: string;
}

export function IdCardsTab({ schoolId }: IdCardsTabProps) {
  const [selected, setSelected] = React.useState<Employee | null>(null);

  function openPrintAll() {
    window.open(`/school/employees/id-cards`, "_blank", "noopener,noreferrer");
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Employee ID Cards
          </CardTitle>
          <Button onClick={openPrintAll} size="sm" className="gap-2">
            <Printer className="h-3.5 w-3.5" />
            Print All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <SearchPicker
          placeholder="Type at least 3 letters to search employees..."
          searchFn={(q) => searchEmployees(schoolId, q)}
          queryKey={(q) => ["employees-search", schoolId, q] as const}
          emptyHint={{
            icon: <CreditCard className="h-7 w-7 text-muted-foreground" />,
            title: "Search for an employee",
            description: "Type at least 3 letters of their name, role, or code. Then click to print their ID card.",
          }}
          onSelect={(item) =>
            setSelected({
              id: item.id,
              name: item.name,
              photo_url: item.photo_url ?? null,
            } as Employee)
          }
        />

        {/* Selected employee — ID card card */}
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
                    {selected.role}
                    {selected.employee_code && ` · ${selected.employee_code}`}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" className="w-full gap-2">
                <a
                  href={`/school/employees/id-cards?ids=${selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Print ID Card
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}