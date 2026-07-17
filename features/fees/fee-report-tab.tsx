"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Printer,
  Download,
  TrendingUp,
  Wallet,
  AlertCircle,
  BarChart3,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type {
  FeeReportData,
  FeeReportClassBreakdown,
} from "@/services/fee-report.service";

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

async function fetchReport(schoolId: string, feeMonth: string): Promise<FeeReportData> {
  const res = await fetch(`/api/fees/${schoolId}/report?feeMonth=${feeMonth}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load report");
  return json.data;
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

interface FeeReportTabProps {
  schoolId: string;
}

export function FeeReportTab({ schoolId }: FeeReportTabProps) {
  const { toast } = useToast();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [feeMonth, setFeeMonth] = React.useState(defaultMonth);
  const [search, setSearch] = React.useState("");

  const monthOptions = React.useMemo(() => getMonthOptions(), []);

  const { data, isLoading } = useQuery({
    queryKey: ["fee-report", schoolId, feeMonth],
    queryFn: () => fetchReport(schoolId, feeMonth),
  });

  const summary = data?.summary;
  const classBreakdown = data?.classBreakdown ?? [];

  const filteredBreakdown = React.useMemo(() => {
    if (!search.trim()) return classBreakdown;
    const q = search.toLowerCase();
    return classBreakdown.filter((c) => c.className.toLowerCase().includes(q));
  }, [classBreakdown, search]);

  const maxEstimated = Math.max(...classBreakdown.map((c) => c.estimated), 1);

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Please allow popups to print", variant: "destructive" });
      return;
    }

    const monthLabel = monthOptions.find((m) => m.value === feeMonth)?.label ?? feeMonth;
    const s = summary;

    const html = `
<!DOCTYPE html>
<html>
<head>
<title>Fee Report — ${monthLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1f2937; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
  .stats { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; min-width: 160px; }
  .stat-label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
  .stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #f3f4f6; }
  th { padding: 8px 10px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .right { text-align: right; }
  .rate { font-weight: 600; }
  .rate-good { color: #16a34a; }
  .rate-mid { color: #d97706; }
  .rate-low { color: #dc2626; }
  .footer { margin-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <h1>Fee Collection Report</h1>
  <div class="meta">Month: <strong>${monthLabel}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</div>
  ${s ? `
  <div class="stats">
    <div class="stat"><div class="stat-label">Total Students</div><div class="stat-value">${s.totalStudents}</div></div>
    <div class="stat"><div class="stat-label">Estimated</div><div class="stat-value">${formatNum(s.totalEstimated)}</div></div>
    <div class="stat"><div class="stat-label">Collected</div><div class="stat-value">${formatNum(s.totalCollected)}</div></div>
    <div class="stat"><div class="stat-label">Remaining</div><div class="stat-value">${formatNum(s.totalRemaining)}</div></div>
    <div class="stat"><div class="stat-label">Collection Rate</div><div class="stat-value">${s.collectionRate}%</div></div>
  </div>` : ""}
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Class</th>
        <th class="right">Students</th>
        <th class="right">Estimated</th>
        <th class="right">Collected</th>
        <th class="right">Remaining</th>
        <th class="right">Collection Rate</th>
      </tr>
    </thead>
    <tbody>
      ${filteredBreakdown.map((c, i) => {
        const rateClass = c.collectionRate >= 75 ? "rate-good" : c.collectionRate >= 50 ? "rate-mid" : "rate-low";
        return `
        <tr>
          <td>${i + 1}</td>
          <td>${c.className}</td>
          <td class="right">${c.students}</td>
          <td class="right">${formatNum(c.estimated)}</td>
          <td class="right">${formatNum(c.collected)}</td>
          <td class="right">${formatNum(c.remaining)}</td>
          <td class="right rate ${rateClass}">${c.collectionRate}%</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
  <div class="footer">Generated by School ERP — ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  function handleExportExcel() {
    if (filteredBreakdown.length === 0) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }

    const XLSX = require("xlsx-js-style");
    const monthLabel = monthOptions.find((m) => m.value === feeMonth)?.label ?? feeMonth;

    const headers = ["#", "Class", "Students", "Estimated", "Collected", "Remaining", "Collection Rate"];
    const aoa: (string | number)[][] = [headers];

    for (const c of filteredBreakdown) {
      aoa.push([
        filteredBreakdown.indexOf(c) + 1,
        c.className,
        c.students,
        c.estimated,
        c.collected,
        c.remaining,
        `${c.collectionRate}%`,
      ]);
    }

    // Add summary row
    if (summary) {
      aoa.push([]);
      aoa.push(["", "TOTAL", summary.totalStudents, summary.totalEstimated, summary.totalCollected, summary.totalRemaining, `${summary.collectionRate}%`]);
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
          const isTotalRow = r === aoa.length - 1 && aoa[r][1] === "TOTAL";
          ws[cellRef].s = {
            fill: { fgColor: { rgb: isTotalRow ? "E0E7FF" : r % 2 === 0 ? "F3F4F6" : "FFFFFF" } },
            font: { color: { rgb: "374151" }, sz: 11, bold: isTotalRow },
            alignment: { vertical: "center", wrapText: true, horizontal: c >= 2 ? "right" : "left" },
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

    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    ws["!rows"] = [{ hpt: 32 }, ...Array(aoa.length - 1).fill({ hpt: 24 })];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fee Report");
    XLSX.writeFile(wb, `fee-report-${feeMonth}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Report exported", variant: "success" });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={feeMonth} onValueChange={setFeeMonth}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportExcel} disabled={classBreakdown.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handlePrint} disabled={classBreakdown.length === 0}>
            <Printer className="h-3.5 w-3.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimated</p>
                <p className="text-2xl font-bold">{formatNum(summary.totalEstimated)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collected</p>
                <p className="text-2xl font-bold">{formatNum(summary.totalCollected)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold">{formatNum(summary.totalRemaining)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50">
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold">{summary.collectionRate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Collection by Class — Bar Chart */}
      {classBreakdown.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Collection by Class</h3>
            <div className="space-y-3">
              {classBreakdown.map((c) => {
                const collectedPct = c.estimated > 0 ? (c.collected / c.estimated) * 100 : 0;
                const barWidth = (c.estimated / maxEstimated) * 100;
                return (
                  <div key={c.classId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{c.className}</span>
                      <span className="text-muted-foreground">
                        {formatNum(c.collected)} / {formatNum(c.estimated)} ({c.collectionRate}%)
                      </span>
                    </div>
                    <div className="relative h-6 w-full overflow-hidden rounded-md bg-muted">
                      {/* Estimated bar (full width relative to max) */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-md bg-blue-100"
                        style={{ width: `${barWidth}%` }}
                      />
                      {/* Collected bar (overlaid) */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-md bg-blue-500 transition-all"
                        style={{ width: `${(barWidth * collectedPct) / 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-blue-100" /> Estimated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-blue-500" /> Collected
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class Breakdown Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Class Breakdown</h3>
          {/* Search */}
          <div className="relative w-48">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 pr-8 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {filteredBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="font-medium">No data found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search ? `No classes matching "${search}"` : "No fee data for this month."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Students</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Estimated</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Collected</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Remaining</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Collection Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBreakdown.map((c: FeeReportClassBreakdown, i: number) => (
                      <tr key={c.classId} className="border-b transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{c.className}</td>
                        <td className="px-4 py-3 text-right">{c.students}</td>
                        <td className="px-4 py-3 text-right">{formatNum(c.estimated)}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatNum(c.collected)}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">{formatNum(c.remaining)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            c.collectionRate >= 75
                              ? "bg-emerald-500/10 text-emerald-600"
                              : c.collectionRate >= 50
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-red-500/10 text-red-600"
                          }`}>
                            {c.collectionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {summary && (
                    <tfoot>
                      <tr className="border-t-2 bg-muted/20 font-semibold">
                        <td className="px-4 py-3" colSpan={2}>Total</td>
                        <td className="px-4 py-3 text-right">{summary.totalStudents}</td>
                        <td className="px-4 py-3 text-right">{formatNum(summary.totalEstimated)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{formatNum(summary.totalCollected)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatNum(summary.totalRemaining)}</td>
                        <td className="px-4 py-3 text-right">{summary.collectionRate}%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
