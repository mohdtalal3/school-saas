"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  X,
  Download,
  Loader2,
  FileSpreadsheet,
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

export interface DirectoryColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number | null;
  className?: string;
}

export interface DirectoryClassFilter {
  classes: { id: string; name: string }[];
}

interface DirectoryTableProps<T extends { id: string; is_active: boolean }> {
  schoolId: string;
  fetchFn: (
    schoolId: string,
    params: { page: number; limit: number; search: string; active: boolean | "all"; classId?: string }
  ) => Promise<{ data: T[]; total: number }>;
  queryKeyPrefix: string;
  columns: DirectoryColumn<T>[];
  exportColumns: DirectoryColumn<T>[];
  exportFilename: string;
  entityLabel: string;
  toggleEndpoint: string;
  classFilter?: DirectoryClassFilter;
}

type ActiveFilter = "active" | "inactive" | "all";

export function DirectoryTable<T extends { id: string; is_active: boolean }>({
  schoolId,
  fetchFn,
  queryKeyPrefix,
  columns,
  exportColumns,
  exportFilename,
  entityLabel,
  toggleEndpoint,
  classFilter,
}: DirectoryTableProps<T>) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { page, pageSize, search, setPage, setSearch, handlePageSizeChange } = useServerPagination();
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>("active");
  const [classId, setClassId] = React.useState<string>("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const activeParam: boolean | "all" =
    activeFilter === "active" ? true : activeFilter === "inactive" ? false : "all";

  const { data, isLoading } = useQuery({
    queryKey: [queryKeyPrefix, schoolId, page, pageSize, debouncedSearch, activeParam, classId],
    queryFn: () =>
      fetchFn(schoolId, {
        page,
        limit: pageSize,
        search: debouncedSearch,
        active: activeParam,
        classId: classId !== "all" ? classId : undefined,
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

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(toggleEndpoint.replace("{id}", id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeyPrefix] });
      toast({ title: "Status updated", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const [exporting, setExporting] = React.useState(false);

  function downloadCsv(rowsToExport: T[], filenameSuffix: string) {
    if (rowsToExport.length === 0) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }

    const headers = exportColumns.map((c) => c.label);
    const csvLines: string[] = [headers.join(",")];

    for (const row of rowsToExport) {
      const values = exportColumns.map((c) => {
        const val = c.exportValue
          ? c.exportValue(row)
          : String((row as Record<string, unknown>)[c.key] ?? "");
        const str = val === null || val === undefined ? "" : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(values.join(","));
    }

    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}-${filenameSuffix}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv(selectedOnly: boolean) {
    const rowsToExport = selectedOnly
      ? rows.filter((r) => selectedIds.has(r.id))
      : rows;
    downloadCsv(rowsToExport, selectedOnly ? "selected" : "page");
  }

  async function exportAll() {
    setExporting(true);
    try {
      const result = await fetchFn(schoolId, {
        page: 1,
        limit: 100000,
        search: "",
        active: activeParam,
        classId: classId !== "all" ? classId : undefined,
      });
      downloadCsv(result.data, "all");
      toast({ title: `Exported ${result.data.length} ${entityLabel}`, variant: "success" });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  async function exportByClass(clsId: string, clsName: string) {
    setExporting(true);
    try {
      const result = await fetchFn(schoolId, {
        page: 1,
        limit: 100000,
        search: "",
        active: "all",
        classId: clsId,
      });
      downloadCsv(result.data, `class-${clsName}`);
      toast({ title: `Exported ${result.data.length} students from ${clsName}`, variant: "success" });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Active filter tabs */}
          <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
            {(["active", "inactive", "all"] as ActiveFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setActiveFilter(f);
                  setPage(1);
                }}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  activeFilter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          {/* Class filter (optional) */}
          {classFilter && (
            <Select value={classId} onValueChange={(v) => { setClassId(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classFilter.classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${entityLabel}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => exportCsv(true)}
          disabled={selectedIds.size === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Export selected ({selectedIds.size})
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => exportCsv(false)}
        >
          <Download className="h-3.5 w-3.5" />
          Export page
        </Button>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          onClick={exportAll}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
          Export all ({total})
        </Button>
        {classFilter && classFilter.classes.length > 0 && (
          <Select onValueChange={(v) => {
            const cls = classFilter.classes.find((c) => c.id === v);
            if (cls) exportByClass(cls.id, cls.name);
          }}>
            <SelectTrigger className="w-44 gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              <SelectValue placeholder="Export by class" />
            </SelectTrigger>
            <SelectContent>
              {classFilter.classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-medium">No {entityLabel} found</p>
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
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 text-left font-medium text-muted-foreground ${col.className ?? ""}`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Status
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
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                          {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: row.id,
                              isActive: !row.is_active,
                            })
                          }
                          disabled={toggleMutation.isPending}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            row.is_active
                              ? "bg-green-500"
                              : "bg-red-400"
                          }`}
                          title={row.is_active ? "Click to deactivate" : "Click to activate"}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              row.is_active ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                          <span
                            className={`absolute text-[9px] font-bold uppercase ${
                              row.is_active ? "left-1.5 text-white" : "right-1.5 text-white"
                            }`}
                          >
                            {row.is_active ? "ON" : "OFF"}
                          </span>
                        </button>
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
