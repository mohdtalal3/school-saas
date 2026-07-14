"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  UsersRound,
  Search,
  Loader2,
  X,
  User,
  GraduationCap,
  Phone,
  CalendarDays,
  Users,
  Gift,
  BadgeDollarSign,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface FamilyStudent {
  id: string;
  name: string;
  registration_no: string | null;
  class_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  mobile: string | null;
  is_active: boolean;
  is_free: boolean;
  discount: number;
  previous_balance: number;
  monthly_fee: number;
  net_fee: number;
}

interface Family {
  father_nic: string;
  father_name: string | null;
  students: FamilyStudent[];
}

interface FamilyTabProps {
  schoolId: string;
}

async function fetchFamilies(
  schoolId: string,
  search: string
): Promise<{ families: Family[]; total: number }> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await fetch(
    `/api/students/${schoolId}/families?${params.toString()}`
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error);
  return json.data;
}

export function FamilyTab({ schoolId }: FamilyTabProps) {
  const [search, setSearch] = React.useState("");
  const [submittedSearch, setSubmittedSearch] = React.useState("");
  const [hasSearched, setHasSearched] = React.useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedSearch(search.trim());
    setHasSearched(true);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["families", schoolId, submittedSearch],
    queryFn: () => fetchFamilies(schoolId, submittedSearch),
    enabled: hasSearched,
  });

  const families = data?.families ?? [];
  const total = data?.total ?? 0;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <UsersRound className="h-4 w-4 text-muted-foreground" />
          Family Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by father CNIC, father name, or student name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setHasSearched(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Results */}
        {hasSearched && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : families.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <UsersRound className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-medium">No families found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No results for &ldquo;{submittedSearch}&rdquo;
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {total} family{total !== 1 ? "ies" : ""} found
                </p>
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {families.map((family) => (
                      <motion.div
                        key={family.father_nic}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FamilyCard family={family} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </>
        )}

        {/* Initial empty state before any search */}
        {!hasSearched && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <UsersRound className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">Search for a family</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Type a father CNIC, father name, or student name above to find
              siblings grouped by family.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FamilyCard({ family }: { family: Family }) {
  const [expanded, setExpanded] = React.useState(false);
  const totalFee = family.students.reduce((sum, s) => sum + s.net_fee, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-medium">
          <div className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-primary" />
            <span className="truncate">
              {family.father_name ?? "Unknown Father"}
            </span>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {family.students.length} siblings
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          CNIC: {family.father_nic}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {(expanded ? family.students : family.students.slice(0, 2)).map(
          (student) => (
            <div
              key={student.id}
              className="rounded-lg border bg-muted/20 px-3 py-2.5 mb-2 last:mb-0"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(student.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {student.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {student.registration_no && (
                      <span>{student.registration_no}</span>
                    )}
                    {student.class_name && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {student.class_name}
                      </span>
                    )}
                    {student.gender && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {student.gender}
                      </span>
                    )}
                    {student.mobile && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {student.mobile}
                      </span>
                    )}
                    {student.date_of_birth && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {student.date_of_birth}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      student.is_active
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {student.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Fee info row */}
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
                {student.is_free ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                    <Gift className="h-3 w-3" />
                    Free Education
                  </span>
                ) : (
                  <>
                    {student.discount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                        <BadgeDollarSign className="h-3 w-3" />
                        Discount: Rs {student.discount}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Wallet className="h-3 w-3" />
                      Fee: Rs {student.net_fee}
                    </span>
                  </>
                )}
                {student.previous_balance > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                    <Wallet className="h-3 w-3" />
                    Prev. Balance: Rs {student.previous_balance}
                  </span>
                )}
              </div>
            </div>
          )
        )}

        {family.students.length > 2 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <Users className="h-3.5 w-3.5" />
            {expanded
              ? "Show less"
              : `Show ${family.students.length - 2} more sibling${
                  family.students.length - 2 > 1 ? "s" : ""
                }`}
          </button>
        )}

        {/* Family total fee */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            Total Monthly Fee (all siblings)
          </span>
          <span className="text-sm font-semibold text-primary">
            Rs {totalFee}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
