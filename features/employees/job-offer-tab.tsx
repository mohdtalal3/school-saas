"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  FileText,
  X,
  Users,
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

interface JobOfferTabProps {
  schoolId: string;
}

export function JobOfferTab({ schoolId }: JobOfferTabProps) {
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
        e.phone?.includes(q) ||
        e.cnic?.includes(q)
    );
  }, [employees, search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employee by name, role, code, phone or CNIC..."
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

      {/* Hint */}
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Search for an employee below and click <strong>Print Offer Letter</strong>{" "}
          to open a print-ready PDF in a new tab.
          Rules &amp; Regulations are pulled from your school&apos;s settings
          automatically.
        </p>
      </div>

      {/* Grid */}
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
            {search ? "No employee found" : "No employees available"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? `No results for "${search}"` : "Add employees first to print offer letters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((employee) => (
            <EmployeeOfferCard key={employee.id} employee={employee} />
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

function EmployeeOfferCard({ employee }: { employee: Employee }) {
  return (
    <Card className="group transition-all hover:border-primary/30 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {employee.photo_url && (
              <AvatarImage src={employee.photo_url} alt={employee.name} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
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
            href={`/school/employees/offer-letter/${employee.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="h-3.5 w-3.5" />
            Print Offer Letter
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
