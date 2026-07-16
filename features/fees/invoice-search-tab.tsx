"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Loader2,
  FileText,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { FeeInvoice } from "@/types/school.types";

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchInvoices(
  schoolId: string,
  params: { page: number; limit: number; search?: string; feeMonth?: string }
): Promise<{ data: FeeInvoice[]; total: number }> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) qs.set("search", params.search);
  if (params.feeMonth) qs.set("feeMonth", params.feeMonth);
  const res = await fetch(`/api/fees/${schoolId}/invoices?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

async function deleteInvoiceApi(schoolId: string, invoiceId: string): Promise<void> {
  const res = await fetch(`/api/fees/${schoolId}/invoices/${invoiceId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete");
}

// ── Month helpers ──────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -2; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface InvoiceSearchTabProps {
  schoolId: string;
}

export function InvoiceSearchTab({ schoolId }: InvoiceSearchTabProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [feeMonth, setFeeMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [page, setPage] = React.useState(1);
  const [deleteTarget, setDeleteTarget] = React.useState<FeeInvoice | null>(null);

  const monthOptions = React.useMemo(() => getMonthOptions(), []);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryKey = ["invoice-search", schoolId, { page, limit: 25, debouncedSearch, feeMonth }];

  const hasSearched = debouncedSearch.trim().length > 0;

  const { data: invoicesData, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchInvoices(schoolId, {
      page,
      limit: 25,
      search: debouncedSearch || undefined,
      feeMonth: feeMonth || undefined,
    }),
    enabled: hasSearched,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoiceApi(schoolId, deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setDeleteTarget(null);
      toast({ title: "Invoice deleted", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  function downloadPdf(opts: { ids?: string[]; search?: string; feeMonth?: string }) {
    const params = new URLSearchParams();
    if (opts.ids && opts.ids.length > 0) {
      params.set("ids", opts.ids.join(","));
    } else if (opts.search || opts.feeMonth) {
      if (opts.search) params.set("search", opts.search);
      if (opts.feeMonth) params.set("feeMonth", opts.feeMonth);
    }
    window.open(`/school/fees/invoices?${params.toString()}`, "_blank");
  }

  function getFeeTotal(inv: FeeInvoice): number {
    const raw = inv.particulars;
    const particulars = typeof raw === "string" ? JSON.parse(raw) : (raw ?? []);
    const annualDue = (particulars as Array<{ label: string; amount: number }>).find(
      (p) => p.label.toUpperCase().includes("ANNUAL DUE") && !p.label.toUpperCase().includes("DISCOUNT")
    )?.amount ?? 0;
    return inv.total_amount - annualDue;
  }

  return (
    <>
      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Invoice?</DialogTitle>
                <DialogDescription>
                  {deleteTarget?.invoice_no} — {deleteTarget?.student_name} will be permanently deleted.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Search Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Search, preview, download, or delete generated invoices.
          </p>
        </div>

        {/* Search card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Search Invoices
              {invoicesData && (
                <span className="text-xs font-normal text-muted-foreground">
                  {invoicesData.total} found
                </span>
              )}
              {feeMonth && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-2"
                  onClick={() => downloadPdf({ search: debouncedSearch || undefined, feeMonth: feeMonth || undefined })}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Input
                placeholder="Search by name, reg no, father CNIC, or mobile..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                className="w-full sm:w-72"
              />
              <Select value={feeMonth} onValueChange={(v) => { setFeeMonth(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invoicesData && invoicesData.data.length > 0 ? (
              <div className="space-y-2">
                {invoicesData.data.map((inv, idx) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: idx * 0.02 }}
                    className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{inv.invoice_no}</span>
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          inv.status === "paid" ? "bg-green-50 text-green-700" :
                          inv.status === "partial" ? "bg-amber-50 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {inv.student_name} · {inv.class_name ?? "No class"} · {inv.fee_month}
                      </p>
                      {inv.status === "paid" && (
                        <p className="text-xs text-muted-foreground">
                          Paid: {inv.paid_amount.toLocaleString()} / {getFeeTotal(inv).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-sm shrink-0">
                      {getFeeTotal(inv).toLocaleString()}
                    </span>
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => downloadPdf({ ids: [inv.id] })}
                        title="Preview / Download PDF"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => downloadPdf({ ids: [inv.id] })}
                        title="Download PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70 hover:text-destructive"
                        onClick={() => setDeleteTarget(inv)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}

                {/* Pagination */}
                {invoicesData.total > 25 && (
                  <div className="flex items-center justify-between pt-3">
                    <p className="text-xs text-muted-foreground">
                      Page {page} of {Math.ceil(invoicesData.total / 25)}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= Math.ceil(invoicesData.total / 25)}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : !hasSearched ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Search by name, reg no, father CNIC, or mobile to find invoices.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No invoices found. Try searching by name, reg no, father CNIC, or mobile.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
