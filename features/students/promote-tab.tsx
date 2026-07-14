"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  X,
  Loader2,
  ArrowUpCircle,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { useServerPagination } from "@/lib/use-server-pagination";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StudentWithClass, SchoolClass } from "@/types/school.types";

async function fetchActiveStudents(
  schoolId: string,
  params: { page: number; limit: number; search: string; classId?: string }
): Promise<{ data: StudentWithClass[]; total: number }> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    active: "true",
  });
  if (params.search) qs.set("search", params.search);
  if (params.classId) qs.set("classId", params.classId);
  const res = await fetch(`/api/students/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

async function fetchClasses(schoolId: string): Promise<SchoolClass[]> {
  const res = await fetch(`/api/classes/${schoolId}?limit=1000`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data?.data ?? [];
}

interface PromoteTabProps {
  schoolId: string;
}

export function PromoteTab({ schoolId }: PromoteTabProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { page, pageSize, setPage, handlePageSizeChange } = useServerPagination();
  const [search, setSearch] = React.useState("");
  const [classFilter, setClassFilter] = React.useState<string>("all");
  const [targetClassId, setTargetClassId] = React.useState<string>("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [result, setResult] = React.useState<{
    promoted: number;
    skipped: number;
  } | null>(null);

  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: classes = [] } = useQuery<SchoolClass[]>({
    queryKey: ["classes", schoolId],
    queryFn: () => fetchClasses(schoolId),
  });
  const safeClasses = Array.isArray(classes) ? classes : [];

  const { data, isLoading } = useQuery({
    queryKey: ["promote-students", schoolId, page, pageSize, debouncedSearch, classFilter],
    queryFn: () =>
      fetchActiveStudents(schoolId, {
        page,
        limit: pageSize,
        search: debouncedSearch,
        classId: classFilter !== "all" ? classFilter : undefined,
      }),
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        rows.forEach((r) => next.delete(r.id));
      } else {
        rows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllInClass() {
    if (classFilter === "all") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  const promoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/students/${schoolId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          targetClassId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data as { promoted: number; skipped: number };
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["students", schoolId] });
      qc.invalidateQueries({ queryKey: ["promote-students", schoolId] });
      qc.invalidateQueries({ queryKey: ["classes", schoolId] });
      setSelectedIds(new Set());
      toast({
        title: "Promotion complete",
        description: `${data.promoted} student(s) promoted, ${data.skipped} skipped`,
        variant: "success",
      });
    },
    onError: (e) => {
      toast({
        title: "Promotion failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      {/* Result banner */}
      {result && (
        <div className="flex items-center gap-3 rounded-lg border bg-emerald-500/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-700">
              {result.promoted} student(s) promoted successfully
            </p>
            {result.skipped > 0 && (
              <p className="text-xs text-muted-foreground">
                {result.skipped} skipped (inactive or not found)
              </p>
            )}
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Class filter (source) */}
          <Select
            value={classFilter}
            onValueChange={(v) => {
              setClassFilter(v);
              setPage(1);
              setSelectedIds(new Set());
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {safeClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8"
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
        </div>

        {/* Promote action bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <Select value={targetClassId} onValueChange={setTargetClassId}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Promote to class..." />
            </SelectTrigger>
            <SelectContent>
              {safeClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => promoteMutation.mutate()}
            disabled={
              selectedIds.size === 0 ||
              !targetClassId ||
              promoteMutation.isPending
            }
            className="gap-2"
          >
            {promoteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-4 w-4" />
            )}
            Promote
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      {classFilter !== "all" && rows.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={selectAllInClass}
            className="font-medium text-primary hover:underline"
          >
            Select all {total} students in this class
          </button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="font-medium">No active students found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search ? `No results for "${search}"` : "Try changing the filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="w-10 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-muted-foreground"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground font-mono text-xs">
                      Reg No
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Current Class
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Father
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Gender
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Free
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b transition-colors hover:bg-muted/30 ${
                        selectedIds.has(row.id) ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          className="h-4 w-4 rounded border-muted-foreground"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.registration_no ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3">{row.class_name ?? "—"}</td>
                      <td className="px-4 py-3">{row.father_name ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">{row.gender ?? "—"}</td>
                      <td className="px-4 py-3">
                        {row.is_free ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600">
                            Free
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
