"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  Printer,
  Loader2,
  Users,
  TrendingDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { useServerPagination } from "@/lib/use-server-pagination";
import { useToast } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SchoolClass } from "@/types/school.types";
import type { FeeDefaulter } from "@/services/fee-defaulters.service";

async function fetchDefaulters(
  schoolId: string,
  params: { page: number; limit: number; search: string; classId?: string; feeMonth?: string; statusFilter?: string }
): Promise<{ data: FeeDefaulter[]; total: number }> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) qs.set("search", params.search);
  if (params.classId) qs.set("classId", params.classId);
  if (params.feeMonth) qs.set("feeMonth", params.feeMonth);
  if (params.statusFilter && params.statusFilter !== "all") qs.set("statusFilter", params.statusFilter);
  const res = await fetch(`/api/fees/${schoolId}/defaulters?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

async function fetchClasses(schoolId: string): Promise<SchoolClass[]> {
  const res = await fetch(`/api/classes/${schoolId}?limit=1000`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data.data;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -6; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

interface FeeDefaultersTabProps {
  schoolId: string;
}

export function FeeDefaultersTab({ schoolId }: FeeDefaultersTabProps) {
  const { toast } = useToast();
  const { page, pageSize, setPage, handlePageSizeChange } = useServerPagination();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [classId, setClassId] = React.useState<string>("all");
  const [feeMonth, setFeeMonth] = React.useState<string>(defaultMonth);
  const [statusFilter, setStatusFilter] = React.useState<string>("unpaid");

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, setPage]);

  const monthOptions = React.useMemo(() => getMonthOptions(), []);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-for-defaulters", schoolId],
    queryFn: () => fetchClasses(schoolId),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["fee-defaulters", schoolId, page, pageSize, debouncedSearch, classId, feeMonth, statusFilter],
    queryFn: () =>
      fetchDefaulters(schoolId, {
        page,
        limit: pageSize,
        search: debouncedSearch,
        classId: classId !== "all" ? classId : undefined,
        feeMonth,
        statusFilter,
      }),
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const totalRemaining = rows.reduce((sum, r) => sum + r.remaining, 0);

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Please allow popups to print", variant: "destructive" });
      return;
    }

    const monthLabel = monthOptions.find((m) => m.value === feeMonth)?.label ?? feeMonth;
    const classLabel = classId !== "all" ? classes.find((c) => c.id === classId)?.name ?? "All" : "All";

    const html = `
<!DOCTYPE html>
<html>
<head>
<title>Fee Defaulters — ${monthLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1f2937; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
  .stats { display: flex; gap: 24px; margin-bottom: 16px; }
  .stat { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
  .stat-label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
  .stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #f3f4f6; }
  th { padding: 8px 10px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .status-unpaid { color: #dc2626; font-weight: 600; }
  .status-partial { color: #d97706; font-weight: 600; }
  .right { text-align: right; }
  .footer { margin-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 12px; } .no-print { display: none; } }
</style>
</head>
<body>
  <h1>Fee Defaulters Report</h1>
  <div class="meta">Month: <strong>${monthLabel}</strong> &nbsp;|&nbsp; Class: <strong>${classLabel}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Total Defaulters</div><div class="stat-value">${total}</div></div>
    <div class="stat"><div class="stat-label">Total Outstanding (this page)</div><div class="stat-value">${totalRemaining.toLocaleString()}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Invoice No</th>
        <th>Reg No</th>
        <th>Student Name</th>
        <th>Class</th>
        <th>Father</th>
        <th>Mobile</th>
        <th class="right">Total</th>
        <th class="right">Paid</th>
        <th class="right">Remaining</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r, i) => `
        <tr>
          <td>${i + 1 + (page - 1) * pageSize}</td>
          <td>${r.invoice_no}</td>
          <td>${r.registration_no ?? "—"}</td>
          <td>${r.student_name}</td>
          <td>${r.class_name ?? "—"}</td>
          <td>${r.father_name ?? "—"}</td>
          <td>${r.mobile ?? "—"}</td>
          <td class="right">${r.total_amount.toLocaleString()}</td>
          <td class="right">${r.paid_amount.toLocaleString()}</td>
          <td class="right">${r.remaining.toLocaleString()}</td>
          <td class="${r.status === "unpaid" ? "status-unpaid" : "status-partial"}">${r.status.toUpperCase()}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <div class="footer">Generated by School ERP — ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Defaulters</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding (this page)</p>
              <p className="text-2xl font-bold">{totalRemaining.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50">
              <Printer className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</p>
              <Button size="sm" className="mt-1 gap-1.5" onClick={handlePrint} disabled={rows.length === 0}>
                <Printer className="h-3.5 w-3.5" />
                Print List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Month filter */}
          <Select value={feeMonth} onValueChange={(v) => { setFeeMonth(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Class filter */}
          <SearchableSelect
            className="w-full sm:w-44"
            value={classId}
            onChange={(value) => { setClassId(value); setPage(1); }}
            options={[
              { value: "all", label: "All Classes" },
              ...classes.map((classItem) => ({ value: classItem.id, label: classItem.name })),
            ]}
            placeholder="Filter by class"
            searchPlaceholder="Search classes..."
          />

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unpaid">Not Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search defaulters..."
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

        {/* Print button */}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint} disabled={rows.length === 0}>
          <Printer className="h-3.5 w-3.5" />
          Print List
        </Button>
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
              <p className="font-medium">No defaulters found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search ? `No results for "${search}"` : "All invoices are paid for this month."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice No</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reg No</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Father</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mobile</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Paid</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Remaining</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-muted-foreground">{i + 1 + (page - 1) * pageSize}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.invoice_no}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.registration_no ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{row.student_name}</td>
                      <td className="px-4 py-3">{row.class_name ?? "—"}</td>
                      <td className="px-4 py-3">{row.father_name ?? "—"}</td>
                      <td className="px-4 py-3">{row.mobile ?? "—"}</td>
                      <td className="px-4 py-3 text-right">{row.total_amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.paid_amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">{row.remaining.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${
                          row.status === "unpaid"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {row.status === "unpaid" ? "Unpaid" : "Partial"}
                        </span>
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
