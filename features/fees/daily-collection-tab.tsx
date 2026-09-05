"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Printer,
  Download,
  Copy,
  Wallet,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SchoolClass } from "@/types/school.types";
import type { DailyCollectionData } from "@/services/fee-report.service";

async function fetchDailyCollection(
  schoolId: string,
  dateFrom: string,
  dateTo: string,
  classId?: string
): Promise<DailyCollectionData> {
  const qs = new URLSearchParams({ dateFrom, dateTo });
  if (classId) qs.set("classId", classId);
  const res = await fetch(`/api/fees/${schoolId}/daily-collection?${qs}`);
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

function formatNum(n: number): string {
  return n.toLocaleString();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

interface DailyCollectionTabProps {
  schoolId: string;
}

export function DailyCollectionTab({ schoolId }: DailyCollectionTabProps) {
  const { toast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = React.useState(today);
  const [dateTo, setDateTo] = React.useState(today);
  const [classId, setClassId] = React.useState("all");

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-for-daily-collection", schoolId],
    queryFn: () => fetchClasses(schoolId),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["daily-collection", schoolId, dateFrom, dateTo, classId],
    queryFn: () =>
      fetchDailyCollection(schoolId, dateFrom, dateTo, classId === "all" ? undefined : classId),
  });

  const entries = data?.data ?? [];
  const summary = data?.summary ?? { totalCollected: 0, paymentCount: 0 };
  const classSubtotals = data?.classSubtotals ?? [];
  const className =
    classId !== "all" ? classes.find((c) => c.id === classId)?.name ?? "All" : "All classes";

  const rangeLabel =
    dateFrom === dateTo
      ? formatDateLabel(`${dateFrom}T00:00:00`)
      : `${formatDateLabel(`${dateFrom}T00:00:00`)} — ${formatDateLabel(`${dateTo}T00:00:00`)}`;

  const printLog = () => {
    const win = window.open("", "_blank");
    if (!win) {
      toast({ title: "Please allow popups to print", variant: "destructive" });
      return;
    }

    const rows = entries
      .map(
        (e, i) => `<tr>
          <td>${i + 1}</td>
          <td>${formatDateLabel(e.payment_date)} ${formatTime(e.payment_date)}</td>
          <td>${e.student_name}</td>
          <td>${e.class_name ?? "—"}</td>
          <td>${e.registration_no ?? "—"}</td>
          <td>${e.invoice_no}</td>
          <td>${e.fee_month ?? "—"}</td>
          <td>${e.note ?? "—"}</td>
          <td class="right amount">${formatNum(e.amount)}</td>
        </tr>`
      )
      .join("");

    const subtotalRows = classSubtotals
      .map(
        (c) => `<tr>
          <td>${c.className}</td>
          <td class="right">${c.count}</td>
          <td class="right amount">${formatNum(c.collected)}</td>
        </tr>`
      )
      .join("");

    win.document.write(`<!DOCTYPE html><html><head><title>Daily Fee Collection</title>
      <style>
        body { font-family: system-ui, Arial, sans-serif; padding: 24px; color: #1f2937; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .meta { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
        .stats { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .stat { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; min-width: 160px; }
        .stat-label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
        h2 { font-size: 14px; margin: 20px 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .right { text-align: right; }
        .amount { font-weight: 600; }
        tfoot tr { background: #f9fafb; font-weight: 700; }
        .footer { margin-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
      </style></head><body>
      <h1>Daily Fee Collection</h1>
      <div class="meta">Period: <strong>${rangeLabel}</strong> &nbsp;|&nbsp; Class: <strong>${className}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</div>
      <div class="stats">
        <div class="stat"><div class="stat-label">Total Collected</div><div class="stat-value">${formatNum(summary.totalCollected)}</div></div>
        <div class="stat"><div class="stat-label">Payments</div><div class="stat-value">${summary.paymentCount}</div></div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Date &amp; Time</th><th>Student</th><th>Class</th><th>Reg No</th>
          <th>Invoice No</th><th>Fee Month</th><th>Note</th><th class="right">Amount</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="9">No payments in this period.</td></tr>`}</tbody>
        <tfoot><tr>
          <td colspan="8">Total</td><td class="right amount">${formatNum(summary.totalCollected)}</td>
        </tr></tfoot>
      </table>
      ${classSubtotals.length > 1 ? `
      <h2>Class Subtotals</h2>
      <table>
        <thead><tr><th>Class</th><th class="right">Payments</th><th class="right">Collected</th></tr></thead>
        <tbody>${subtotalRows}</tbody>
      </table>` : ""}
      <div class="footer">Generated by School ERP — ${new Date().toLocaleDateString()}</div>
      <script>window.onload = () => window.print();</script>
      </body></html>`);
    win.document.close();
  };

  const exportExcel = () => {
    if (entries.length === 0) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }
    const XLSX = require("xlsx-js-style");
    const headers = [
      "#", "Date", "Time", "Student", "Class", "Reg No", "Invoice No", "Fee Month", "Note", "Amount",
    ];
    const aoa: Array<Array<string | number>> = [
      ["Daily Fee Collection"],
      [`Period: ${rangeLabel} | Class: ${className}`],
      [`Total Collected: ${formatNum(summary.totalCollected)} | Payments: ${summary.paymentCount}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      headers,
    ];
    entries.forEach((e, i) => {
      aoa.push([
        i + 1,
        formatDateLabel(e.payment_date),
        formatTime(e.payment_date),
        e.student_name,
        e.class_name ?? "",
        e.registration_no ?? "",
        e.invoice_no,
        e.fee_month ?? "",
        e.note ?? "",
        e.amount,
      ]);
    });
    aoa.push([]);
    aoa.push(["", "", "", "", "", "", "", "", "TOTAL", summary.totalCollected]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 5, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "4F46E5" } },
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
        };
      }
    }
    const totalRow = aoa.length - 1;
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: totalRow, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "E0E7FF" } },
          font: { bold: true, color: { rgb: "374151" }, sz: 11 },
        };
      }
    }
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Collection");
    XLSX.writeFile(wb, `daily-collection-${dateFrom}-to-${dateTo}.xlsx`);
    toast({ title: "Daily collection exported", variant: "success" });
  };

  const copyTable = async () => {
    const header =
      "Date\tTime\tStudent\tClass\tReg No\tInvoice No\tFee Month\tNote\tAmount";
    const lines = entries.map((e) =>
      [
        formatDateLabel(e.payment_date),
        formatTime(e.payment_date),
        e.student_name,
        e.class_name ?? "",
        e.registration_no ?? "",
        e.invoice_no,
        e.fee_month ?? "",
        e.note ?? "",
        e.amount,
      ].join("\t")
    );
    await navigator.clipboard.writeText(
      [header, ...lines, ["", "", "", "", "", "", "", "TOTAL", summary.totalCollected].join("\t")].join("\n")
    );
    toast({ title: "Copied to clipboard", variant: "success" });
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e1065]">Daily Collection</h1>
          <p className="text-sm text-muted-foreground">
            Every fee payment, one by one — print and verify the day&apos;s collection.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyTable} disabled={entries.length === 0}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={entries.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button size="sm" onClick={printLog} disabled={entries.length === 0}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Date from"
          />
          <Input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Date to"
          />
          <SearchableSelect
            value={classId}
            onChange={(value) => setClassId(value)}
            options={[
              { value: "all", label: "All Classes" },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
            placeholder="Filter by class"
            searchPlaceholder="Search classes..."
          />
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Collected</p>
              <p className="text-lg font-semibold text-emerald-700">{formatNum(summary.totalCollected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <ReceiptText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Payments</p>
              <p className="text-lg font-semibold">{summary.paymentCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading payments...
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm font-medium text-destructive">Failed to load daily collection</p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "Try again later."}
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm font-medium">No payments in this period</p>
              <p className="text-xs text-muted-foreground">
                Change the date range or class filter to see collected fees.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Class</th>
                    <th className="px-4 py-3 font-semibold">Reg No</th>
                    <th className="px-4 py-3 font-semibold">Invoice No</th>
                    <th className="px-4 py-3 font-semibold">Fee Month</th>
                    <th className="px-4 py-3 font-semibold">Note</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {dateFrom === dateTo ? (
                          formatTime(e.payment_date)
                        ) : (
                          <>
                            {formatDateLabel(e.payment_date)}{" "}
                            <span className="text-muted-foreground">{formatTime(e.payment_date)}</span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{e.student_name}</td>
                      <td className="whitespace-nowrap px-4 py-3">{e.class_name ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">{e.registration_no ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">{e.invoice_no}</td>
                      <td className="whitespace-nowrap px-4 py-3">{e.fee_month ?? "—"}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">{e.note ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700">
                        {formatNum(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/20 font-semibold">
                    <td className="px-4 py-3" colSpan={8}>Total</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatNum(summary.totalCollected)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class subtotals */}
      {classSubtotals.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Class Subtotals</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Class</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Payments</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {classSubtotals.map((c) => (
                    <tr key={c.classId ?? "none"} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">{c.className}</td>
                      <td className="px-4 py-2.5 text-right">{c.count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                        {formatNum(c.collected)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
