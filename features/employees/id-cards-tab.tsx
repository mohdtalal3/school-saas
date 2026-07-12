"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  CreditCard,
  X,
  Users,
  Printer,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Employee } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

async function fetchEmployees(schoolId: string): Promise<Employee[]> {
  const res = await fetch(`/api/employees/${schoolId}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to load");
  return data.data;
}

interface IdCardsTabProps {
  schoolId: string;
}

export function IdCardsTab({ schoolId }: IdCardsTabProps) {
  const [search, setSearch] = React.useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", schoolId],
    queryFn: () => fetchEmployees(schoolId),
  });

  const filtered = React.useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.phone?.includes(q)
    );
  }, [employees, search]);

  // Quick "Print All" — opens the dedicated page with all employees
  function openPrintAll() {
    window.open(`/school/employees/id-cards`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, role, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={openPrintAll} className="gap-2">
          <Printer className="h-4 w-4" />
          Print All Employees
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
        <CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Each A4 sheet prints <strong>6 one-sided ID cards</strong> (2 columns ×
          3 rows). Pick orientation (vertical/horizontal) and theme colors on
          the next page. You can print all employees or only selected ones.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">
            {search ? "No employees found" : "No employees available"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? `No results for "${search}"`
              : "Add employees first to print ID cards."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((employee) => (
            <IdCardEntryCard key={employee.id} employee={employee} />
          ))}
        </div>
      )}

      {search && filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {filtered.length} of {employees.length} employees
        </p>
      )}
    </div>
  );
}

function IdCardEntryCard({ employee }: { employee: Employee }) {
  return (
    <Card className="group transition-all hover:border-primary/30 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {employee.photo_url && (
              <AvatarImage src={employee.photo_url} alt={employee.name} />
            )}
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm font-semibold">
              {employee.name}
            </CardTitle>
            <p className="truncate text-xs text-muted-foreground">
              {employee.role}
            </p>
          </div>
        </div>
        {employee.employee_code && (
          <span className="mt-1.5 self-start rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
            {employee.employee_code}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <Button
          asChild
          size="sm"
          className="w-full gap-2"
        >
          <a
            href={`/school/employees/id-cards?ids=${employee.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Print ID Card
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}