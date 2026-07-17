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
import { SearchableSelect } from "@/components/ui/searchable-select";

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
    params: { page: number; limit: number; search: string; active: boolean | "all"; classId?: string; isFree?: boolean }
  ) => Promise<{ data: T[]; total: number }>;
  queryKeyPrefix: string;
  columns: DirectoryColumn<T>[];
  exportColumns: DirectoryColumn<T>[];
  exportFilename: string;
  entityLabel: string;
  toggleEndpoint: string;
  classFilter?: DirectoryClassFilter;
  controlledSearch?: string;
  controlledSetSearch?: (v: string) => void;
  controlledActiveFilter?: ActiveFilter;
  controlledSetActiveFilter?: (f: ActiveFilter) => void;
  controlledClassId?: string;
  controlledSetClassId?: (v: string) => void;
  controlledIsFree?: boolean;
  hideFilterBar?: boolean;
}

export type ActiveFilter = "active" | "inactive" | "all";

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
  controlledSearch,
  controlledSetSearch,
  controlledActiveFilter,
  controlledSetActiveFilter,
  controlledClassId,
  controlledSetClassId,
  controlledIsFree,
  hideFilterBar,
}: DirectoryTableProps<T>) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { page, pageSize, setPage, handlePageSizeChange } = useServerPagination();
  const [internalSearch, setInternalSearch] = React.useState("");
  const [internalActiveFilter, setInternalActiveFilter] = React.useState<ActiveFilter>("active");
  const [internalClassId, setInternalClassId] = React.useState<string>("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const search = controlledSearch ?? internalSearch;
  const setSearch = controlledSetSearch ?? setInternalSearch;
  const activeFilter = controlledActiveFilter ?? internalActiveFilter;
  const setActiveFilter = controlledSetActiveFilter ?? setInternalActiveFilter;
  const classId = controlledClassId ?? internalClassId;
  const setClassId = controlledSetClassId ?? setInternalClassId;

  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const activeParam: boolean | "all" =
    activeFilter === "active" ? true : activeFilter === "inactive" ? false : "all";

  const { data, isLoading } = useQuery({
    queryKey: [queryKeyPrefix, schoolId, page, pageSize, debouncedSearch, activeParam, classId, controlledIsFree],
    queryFn: () =>
      fetchFn(schoolId, {
        page,
        limit: pageSize,
        search: debouncedSearch,
        active: activeParam,
        classId: classId !== "all" ? classId : undefined,
        isFree: controlledIsFree,
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

  function downloadExcel(rowsToExport: T[], filenameSuffix: string) {
    if (rowsToExport.length === 0) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }

    const XLSX = require("xlsx-js-style");

    const headers = exportColumns.map((c) => c.label);
    const aoa: (string | number)[][] = [headers];

    for (const row of rowsToExport) {
      const values = exportColumns.map((c) => {
        const val = c.exportValue
          ? c.exportValue(row)
          : String((row as Record<string, unknown>)[c.key] ?? "");
        return val === null || val === undefined ? "" : val;
      });
      aoa.push(values as (string | number)[]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Style header row
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "4F46E5" } },
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "4F46E5" } },
            bottom: { style: "thin", color: { rgb: "4F46E5" } },
            left: { style: "thin", color: { rgb: "4F46E5" } },
            right: { style: "thin", color: { rgb: "4F46E5" } },
          },
        };
      }
    }

    // Style data rows
    for (let r = 1; r < aoa.length; r++) {
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: r % 2 === 0 ? "F3F4F6" : "FFFFFF" } },
            font: { color: { rgb: "374151" }, sz: 11 },
            alignment: { vertical: "center", wrapText: true },
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } },
            },
          };
        }
      }
    }

    // Set column widths
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    // Set row heights
    ws["!rows"] = [{ hpt: 32 }, ...Array(aoa.length - 1).fill({ hpt: 24 })];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    XLSX.writeFile(wb, `${exportFilename}-${filenameSuffix}-${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  function exportExcel(selectedOnly: boolean) {
    const rowsToExport = selectedOnly
      ? rows.filter((r) => selectedIds.has(r.id))
      : rows;
    downloadExcel(rowsToExport, selectedOnly ? "selected" : "page");
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
      downloadExcel(result.data, "all");
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
      downloadExcel(result.data, `class-${clsName}`);
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
      {!hideFilterBar && (
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
            <SearchableSelect
              className="w-full sm:w-44"
              value={classId}
              onChange={(value) => { setClassId(value); setPage(1); }}
              options={[
                { value: "all", label: "All Classes" },
                ...classFilter.classes.map((classItem) => ({ value: classItem.id, label: classItem.name })),
              ]}
              placeholder="Filter by class"
              searchPlaceholder="Search classes..."
            />
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
      )}

      {/* Export buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => exportExcel(true)}
          disabled={selectedIds.size === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Export selected ({selectedIds.size})
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => exportExcel(false)}
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
          <SearchableSelect
            className="w-44 text-xs"
            value=""
            onChange={(value) => {
              const selectedClass = classFilter.classes.find((classItem) => classItem.id === value);
              if (selectedClass) exportByClass(selectedClass.id, selectedClass.name);
            }}
            options={classFilter.classes.map((classItem) => ({ value: classItem.id, label: classItem.name }))}
            placeholder="Export by class"
            searchPlaceholder="Search classes..."
          />
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
