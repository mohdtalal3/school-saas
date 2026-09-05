"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Hash,
  Printer,
  FileSpreadsheet,
  Copy,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { useAdminShell } from "@/components/layout/admin-shell";
import { cn } from "@/lib/utils";
import { PAYMENT_METHODS, formatCurrency } from "@/lib/accounts";
import { fetchStatement, fetchCategories } from "./api";
import { TransactionDetailsDialog } from "./transaction-details-dialog";
import type { FinancialTransaction } from "@/types/school.types";

interface FilterState {
  search: string;
  type: "all" | "income" | "expense";
  categoryId: string;
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

const today = new Date().toISOString().slice(0, 10);

export function StatementTab({ schoolId }: { schoolId: string }) {
  const { toast } = useToast();
  const { school } = useAdminShell();
  const currencySymbol = school?.currency_symbol ?? "$";

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [type, setType] = React.useState<"all" | "income" | "expense">("all");
  const [categoryId, setCategoryId] = React.useState("all");
  const [paymentMethod, setPaymentMethod] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState(today);
  const [dateTo, setDateTo] = React.useState(today);
  const [amountMin, setAmountMin] = React.useState("");
  const [amountMax, setAmountMax] = React.useState("");

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sortBy, setSortBy] = React.useState("transaction_date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [selectedTransaction, setSelectedTransaction] =
    React.useState<FinancialTransaction | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = React.useMemo(
    () => ({
      search: debouncedSearch || undefined,
      type: type === "all" ? undefined : type,
      categoryId: categoryId === "all" ? undefined : categoryId,
      paymentMethod: paymentMethod === "all" ? undefined : paymentMethod,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      amountMin: amountMin === "" ? undefined : Number(amountMin),
      amountMax: amountMax === "" ? undefined : Number(amountMax),
      sortBy,
      sortDir,
    }),
    [debouncedSearch, type, categoryId, paymentMethod, dateFrom, dateTo, amountMin, amountMax, sortBy, sortDir]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["financial-statement", schoolId, page, pageSize, filters],
    queryFn: () => fetchStatement(schoolId, filters),
  });

  const { data: categoryData } = useQuery({
    queryKey: ["account-categories", schoolId],
    queryFn: () => fetchCategories(schoolId),
  });
  const allCategories = categoryData?.data ?? [];

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const summary = data?.summary ?? {
    total_income: 0,
    total_expenses: 0,
    net_balance: 0,
    transaction_count: 0,
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortBy !== field ? (
      <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />
    ) : sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );

  const exportExcel = () => {
    // Exports respect the currently applied filters — the server
    // returns only rows matching the active filters.
    const XLSX = require("xlsx-js-style");
    const headers = [
      "Date",
      "Transaction ID",
      "Type",
      "Category",
      "Description",
      "Payer / Paid To",
      "Payment Method",
      "Reference",
      "Amount",
      "Created By",
      "Created At",
    ];
    const aoa: Array<Array<string | number>> = [
      [school?.name ?? "School"],
      ["Financial Statement"],
      [
        `Total Income: ${summary.total_income} | Total Expenses: ${summary.total_expenses} | Net Balance: ${summary.net_balance} | Transactions: ${summary.transaction_count}`,
      ],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      headers,
    ];
    for (const tx of rows) {
      aoa.push([
        tx.transaction_date,
        tx.transaction_number,
        tx.type === "income" ? "Income" : "Expense",
        tx.category_name ?? "",
        tx.description ?? "",
        tx.party_name ?? "",
        tx.payment_method,
        tx.reference_number ?? "",
        tx.amount,
        tx.created_by_name ?? "",
        new Date(tx.created_at).toLocaleString(),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 5, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: "4F46E5" } },
          font: { color: { rgb: "FFFFFF" }, bold: true },
        };
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `financial-statement-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: "Statement exported", variant: "success" });
  };

  const printStatement = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    // Print order for easy checking: all income first, then all expenses
    // (each group keeps the currently applied sort).
    const sortedRows = [...rows].sort((a, b) => {
      if (a.type !== b.type) return a.type === "income" ? -1 : 1;
      return 0;
    });
    const incomeTotal = rows
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expenseTotal = rows
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const rowHtml = (tx: (typeof rows)[number]) => `<tr>
          <td>${tx.transaction_date}</td>
          <td>${tx.transaction_number}</td>
          <td>${tx.category_name ?? ""}</td>
          <td>${tx.description ?? ""}</td>
          <td>${tx.party_name ?? ""}</td>
          <td>${tx.payment_method}</td>
          <td>${tx.reference_number ?? ""}</td>
          <td style="text-align:right;color:${tx.type === "income" ? "#047857" : "#be123c"}">${formatCurrency(tx.amount, currencySymbol)}</td>
          <td>${tx.created_by_name ?? ""}</td>
        </tr>`;

    const incomeRows = sortedRows.filter((tx) => tx.type === "income").map(rowHtml).join("");
    const expenseRows = sortedRows.filter((tx) => tx.type === "expense").map(rowHtml).join("");
    const periodLabel =
      dateFrom || dateTo
        ? `Period: <strong>${dateFrom || "…"} — ${dateTo || "…"}</strong> &middot; `
        : "";

    win.document.write(`<!DOCTYPE html><html><head><title>Financial Statement</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #1e1b4b; }
        h1 { margin: 0; font-size: 20px; }
        .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
        .summary { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; min-width: 150px; }
        .card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; }
        .card .value { font-size: 17px; font-weight: 700; margin-top: 2px; }
        .card.net { background: #eef2ff; border-color: #6366f1; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; }
        .section td { background: #f8fafc; font-weight: 700; font-size: 12px; }
        .subtotal td { background: #f1f5f9; font-weight: 700; }
        .signatures { display: flex; justify-content: space-between; margin-top: 48px; page-break-inside: avoid; }
        .sig { width: 220px; text-align: center; font-size: 12px; }
        .sig .line { border-top: 1px solid #1e1b4b; margin-bottom: 6px; }
        .sig .role { font-weight: 700; }
      </style></head><body>
      <h1>${school?.name ?? "School"}</h1>
      <div class="sub">Financial Statement &middot; ${periodLabel}Generated ${new Date().toLocaleString()}</div>
      <div class="summary">
        <div class="card"><div class="label">Total Income</div><div class="value" style="color:#047857">${formatCurrency(summary.total_income, currencySymbol)}</div></div>
        <div class="card"><div class="label">Total Expenses</div><div class="value" style="color:#be123c">${formatCurrency(summary.total_expenses, currencySymbol)}</div></div>
        <div class="card net"><div class="label">Net Balance</div><div class="value">${formatCurrency(summary.net_balance, currencySymbol)}</div></div>
        <div class="card"><div class="label">Transactions</div><div class="value">${summary.transaction_count}</div></div>
      </div>
      <table><thead><tr>
        <th>Date</th><th>Transaction ID</th><th>Category</th>
        <th>Description</th><th>Payer / Paid To</th><th>Method</th><th>Reference</th><th>Amount</th><th>Created By</th>
      </tr></thead><tbody>
        ${incomeRows ? `<tr class="section"><td colspan="9">INCOME</td></tr>${incomeRows}
        <tr class="subtotal"><td colspan="7">Total Income</td><td style="text-align:right;color:#047857">${formatCurrency(incomeTotal, currencySymbol)}</td><td></td></tr>` : ""}
        ${expenseRows ? `<tr class="section"><td colspan="9">EXPENSES</td></tr>${expenseRows}
        <tr class="subtotal"><td colspan="7">Total Expenses</td><td style="text-align:right;color:#be123c">${formatCurrency(expenseTotal, currencySymbol)}</td><td></td></tr>` : ""}
        <tr class="subtotal"><td colspan="7">NET BALANCE (Income − Expenses)</td><td style="text-align:right;font-weight:700">${formatCurrency(summary.net_balance, currencySymbol)}</td><td></td></tr>
      </tbody></table>
      <div class="signatures">
        <div class="sig"><div class="line"></div><div class="role">Accountant</div></div>
        <div class="sig"><div class="line"></div><div class="role">Principal</div></div>
      </div>
      <script>window.onload = () => window.print();</script>
      </body></html>`);
    win.document.close();
  };

  const copyTable = async () => {
    const header =
      "Date\tTransaction ID\tType\tCategory\tDescription\tPayer/Paid To\tMethod\tReference\tAmount\tCreated By";
    const lines = rows.map((tx) =>
      [
        tx.transaction_date,
        tx.transaction_number,
        tx.type,
        tx.category_name ?? "",
        tx.description ?? "",
        tx.party_name ?? "",
        tx.payment_method,
        tx.reference_number ?? "",
        tx.amount,
        tx.created_by_name ?? "",
      ].join("\t")
    );
    await navigator.clipboard.writeText([header, ...lines].join("\n"));
    toast({ title: "Table copied to clipboard", variant: "success" });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e1065]">Statement</h1>
          <p className="text-sm text-muted-foreground">
            Every income and expense transaction in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={printStatement}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={copyTable}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Income</p>
              <p className="text-lg font-semibold text-emerald-700">
                {formatCurrency(summary.total_income, currencySymbol)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Expenses</p>
              <p className="text-lg font-semibold text-rose-700">
                {formatCurrency(summary.total_expenses, currencySymbol)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
              <Wallet className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Net Balance</p>
              <p
                className={cn(
                  "text-lg font-semibold",
                  summary.net_balance >= 0 ? "text-violet-700" : "text-rose-700"
                )}
              >
                {formatCurrency(summary.net_balance, currencySymbol)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Hash className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Transactions</p>
              <p className="text-lg font-semibold">{summary.transaction_count}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ID, category, description, payer, vendor, reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as typeof type);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {allCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={paymentMethod}
              onValueChange={(v) => {
                setPaymentMethod(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="Date from"
            />
            <Input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label="Date to"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Min amount"
                value={amountMin}
                onChange={(e) => {
                  setAmountMin(e.target.value);
                  setPage(1);
                }}
                aria-label="Minimum amount"
              />
              <Input
                type="number"
                placeholder="Max amount"
                value={amountMax}
                onChange={(e) => {
                  setAmountMax(e.target.value);
                  setPage(1);
                }}
                aria-label="Maximum amount"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setType("all");
                setCategoryId("all");
                setPaymentMethod("all");
                setDateFrom(today);
                setDateTo(today);
                setAmountMin("");
                setAmountMax("");
                setPage(1);
              }}
            >
              <X className="mr-2 h-3.5 w-3.5" /> Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statement table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading transactions...
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm font-medium text-destructive">Failed to load statement</p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "Try again later."}
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm font-medium">No transactions found</p>
              <p className="text-xs text-muted-foreground">
                Adjust the filters or record income and expenses to see them here.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="cursor-pointer px-4 py-3 font-semibold" onClick={() => toggleSort("transaction_date")}>
                        Date <SortIcon field="transaction_date" />
                      </th>
                      <th className="cursor-pointer px-4 py-3 font-semibold" onClick={() => toggleSort("transaction_number")}>
                        Transaction ID <SortIcon field="transaction_number" />
                      </th>
                      <th className="cursor-pointer px-4 py-3 font-semibold" onClick={() => toggleSort("type")}>
                        Type <SortIcon field="type" />
                      </th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold">Payer / Paid To</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                      <th className="px-4 py-3 font-semibold">Reference</th>
                      <th className="cursor-pointer px-4 py-3 text-right font-semibold" onClick={() => toggleSort("amount")}>
                        Amount <SortIcon field="amount" />
                      </th>
                      <th className="px-4 py-3 font-semibold">Attachment</th>
                      <th className="px-4 py-3 font-semibold">Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((tx) => (
                      <tr
                        key={tx.id}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                        onClick={() => setSelectedTransaction(tx)}
                      >
                        <td className="whitespace-nowrap px-4 py-3">{tx.transaction_date}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          {tx.transaction_number}
                          {tx.source === "fee_collection" && (
                            <span
                              className="ml-2 inline-flex items-center rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600"
                              title="Auto-generated from that day's fee collections"
                            >
                              Auto
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              tx.type === "income"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            )}
                          >
                            {tx.type === "income" ? "Income" : "Expense"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{tx.category_name ?? "—"}</td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">
                          {tx.description || "—"}
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3">{tx.party_name || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{tx.payment_method}</td>
                        <td className="max-w-[140px] truncate px-4 py-3">{tx.reference_number || "—"}</td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-4 py-3 text-right font-semibold",
                            tx.type === "income" ? "text-emerald-700" : "text-rose-700"
                          )}
                        >
                          {tx.type === "income" ? "+" : "−"}
                          {formatCurrency(tx.amount, currencySymbol)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Paperclip className="mx-auto h-3.5 w-3.5 opacity-30" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">{tx.created_by_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <TransactionDetailsDialog
        schoolId={schoolId}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
