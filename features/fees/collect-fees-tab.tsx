"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Loader2,
  Search,
  Wallet,
  FileText,
  CheckCircle2,
  Clock,
  Receipt,
  History,
  Trash2,
  AlertCircle,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { FeeInvoice, FeePayment, InvoiceParticular, FeeAllocation } from "@/types/school.types";

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchInvoicesForCollect(
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

async function collectFeeApi(
  schoolId: string,
  payload: { invoice_id: string; allocations: FeeAllocation[]; payment_note?: string; add_fine?: boolean }
): Promise<{ invoice: FeeInvoice; payment: FeePayment }> {
  const res = await fetch(`/api/fees/${schoolId}/collect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to collect");
  return data.data;
}

async function fetchPaymentHistory(schoolId: string, invoiceId: string): Promise<FeePayment[]> {
  const res = await fetch(`/api/fees/${schoolId}/collect?invoiceId=${invoiceId}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data ?? [];
}

async function deletePaymentApi(schoolId: string, paymentId: string): Promise<void> {
  const res = await fetch(`/api/fees/${schoolId}/collect?paymentId=${paymentId}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to delete payment");
}

// ── Month helpers ──────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -6; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseParticulars(invoice: FeeInvoice): InvoiceParticular[] {
  const raw = invoice.particulars;
  return typeof raw === "string" ? JSON.parse(raw) : (raw ?? []);
}

function getInvoiceTotal(invoice: FeeInvoice): number {
  return invoice.total_amount;
}

function getInvoicePaid(invoice: FeeInvoice): number {
  return invoice.paid_amount;
}

function getInvoiceRemaining(invoice: FeeInvoice): number {
  return invoice.total_amount - invoice.paid_amount - (invoice.waived_amount ?? 0);
}

const STATUS_COLORS: Record<string, string> = {
  unpaid: "bg-gray-100 text-gray-600",
  partial: "bg-amber-50 text-amber-700",
  paid: "bg-green-50 text-green-700",
  waived: "bg-blue-50 text-blue-700",
};

function statusBgClass(status: string): string {
  if (status === "paid") return "bg-green-50";
  if (status === "partial") return "bg-amber-50";
  return "bg-gray-100";
}

function statusBadgeClass(status: string): string {
  if (status === "paid") return "bg-green-50 text-green-700";
  if (status === "partial") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

// ── Component ──────────────────────────────────────────────────────────────────

interface CollectFeesTabProps {
  schoolId: string;
}

export function CollectFeesTab({ schoolId }: CollectFeesTabProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [feeMonth, setFeeMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [page, setPage] = React.useState(1);

  const [payDialogOpen, setPayDialogOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<FeeInvoice | null>(null);
  const [allocations, setAllocations] = React.useState<Record<string, number>>({});
  const [paymentNote, setPaymentNote] = React.useState("");
  const [addFine, setAddFine] = React.useState(false);

  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyInvoice, setHistoryInvoice] = React.useState<FeeInvoice | null>(null);

  const [printInvoiceId, setPrintInvoiceId] = React.useState<string | null>(null);

  const monthOptions = React.useMemo(() => getMonthOptions(), []);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryKey = ["collect-invoices", schoolId, { page, limit: 25, debouncedSearch, feeMonth }];

  const { data: invoicesData, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchInvoicesForCollect(schoolId, {
      page,
      limit: 25,
      search: debouncedSearch || undefined,
      feeMonth: feeMonth || undefined,
    }),
    enabled: debouncedSearch.trim().length > 0,
  });

  const collectMutation = useMutation({
    mutationFn: () => {
      if (!selectedInvoice) throw new Error("No invoice selected");
      const allocArray: FeeAllocation[] = Object.entries(allocations)
        .filter(([, amt]) => amt > 0)
        .map(([label, amount]) => ({ label, amount }));
      if (allocArray.length === 0) throw new Error("Enter at least one allocation amount");
      return collectFeeApi(schoolId, {
        invoice_id: selectedInvoice.id,
        allocations: allocArray,
        payment_note: paymentNote || undefined,
        add_fine: addFine || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      const paidInvoiceId = selectedInvoice?.id;
      setPayDialogOpen(false);
      setSelectedInvoice(null);
      setAllocations({});
      setPaymentNote("");
      setAddFine(false);
      setPrintInvoiceId(paidInvoiceId ?? null);
      toast({ title: "Payment recorded successfully", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Payment failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  function openPayDialog(invoice: FeeInvoice) {
    setSelectedInvoice(invoice);
    setAllocations({});
    setPaymentNote("");
    setAddFine(false);
    setPayDialogOpen(true);
  }

  const selectedParticulars = selectedInvoice ? parseParticulars(selectedInvoice) : [];
  const fineAmount = selectedInvoice?.fine_after_due ?? 0;
  const isOverdue = selectedInvoice
    ? new Date(selectedInvoice.due_date + "T23:59:59") < new Date()
    : false;

  const displayParticulars: InvoiceParticular[] = React.useMemo(() => {
    const parts = [...selectedParticulars];
    if (addFine && fineAmount > 0 && !parts.find((p) => p.label.toUpperCase().includes("FINE"))) {
      parts.push({ label: "LATE FINE", amount: fineAmount, paid_amount: 0, status: "unpaid", is_fixed: false, source_type: null });
    }
    return parts;
  }, [selectedParticulars, addFine, fineAmount]);

  const totalAllocated = Object.values(allocations).reduce((sum, a) => sum + a, 0);
  const totalRemaining = displayParticulars.reduce((sum, p) => {
    if (p.status === "waived" || p.status === "paid") return sum;
    return sum + (p.amount - p.paid_amount);
  }, 0);

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => deletePaymentApi(schoolId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["payment-history", schoolId, historyInvoice?.id] });
      toast({ title: "Payment deleted, invoice restored", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Failed to delete payment",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  async function openHistory(invoice: FeeInvoice) {
    setHistoryInvoice(invoice);
    setHistoryOpen(true);
  }

  const { data: paymentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["payment-history", schoolId, historyInvoice?.id],
    queryFn: () => fetchPaymentHistory(schoolId, historyInvoice!.id),
    enabled: !!historyInvoice && historyOpen,
  });

  return (
    <>
      {/* Payment dialog */}
      <Dialog open={payDialogOpen} onOpenChange={(o) => { if (!o) { setPayDialogOpen(false); setSelectedInvoice(null); setAllocations({}); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Collect Fee</DialogTitle>
                <DialogDescription>
                  {selectedInvoice?.invoice_no} — {selectedInvoice?.student_name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedInvoice && (
            <>
              {/* Student info bar */}
              <div className="flex items-center gap-4 rounded-lg border p-3 text-sm">
                <div className="flex-1">
                  <span className="text-muted-foreground">Class: </span>
                  <span className="font-medium">{selectedInvoice.class_name ?? "—"}</span>
                </div>
                <div className="flex-1">
                  <span className="text-muted-foreground">Month: </span>
                  <span className="font-medium">{selectedInvoice.fee_month}</span>
                </div>
                <div className="flex-1">
                  <span className="text-muted-foreground">Due: </span>
                  <span className={"font-medium " + (isOverdue ? "text-red-600" : "")}>
                    {new Date(selectedInvoice.due_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Late fine toggle */}
              {fineAmount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !addFine;
                    setAddFine(next);
                    if (!next && allocations["LATE FINE"]) {
                      const copy = { ...allocations };
                      delete copy["LATE FINE"];
                      setAllocations(copy);
                    }
                  }}
                  className={"flex w-full items-center justify-between rounded-lg border px-4 py-2.5 transition-colors " + (addFine ? "border-red-300 bg-red-50" : "border-gray-200 hover:bg-gray-50")}
                >
                  <div className="flex items-center gap-2">
                    <div className={"flex h-4 w-4 items-center justify-center rounded border " + (addFine ? "border-red-600 bg-red-600" : "border-gray-400")}>
                      {addFine && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium">
                      Add Late Fine ({fineAmount.toLocaleString()})
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isOverdue ? "Due date passed" : "Due: " + new Date(selectedInvoice.due_date).toLocaleDateString()}
                  </span>
                </button>
              )}

              {/* Particulars table */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Particular</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Paid</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Remaining</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Allocate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayParticulars.map((p) => {
                      const remaining = p.amount - p.paid_amount;
                      const alloc = allocations[p.label] ?? 0;
                      const isDiscount = p.label.toUpperCase().includes("DISCOUNT");
                      const isSettled = p.status === "paid" || p.status === "waived";
                      return (
                        <tr key={p.label} className="border-t">
                          <td className="px-3 py-2 font-medium">{p.label}</td>
                          <td className="px-3 py-2 text-right">{p.amount.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-green-600">{p.paid_amount.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-semibold text-orange-600">{remaining.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={"inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium " + (STATUS_COLORS[p.status] ?? STATUS_COLORS.unpaid)}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              value={alloc || ""}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                setAllocations((prev) => ({ ...prev, [p.label]: Math.min(val, remaining) }));
                              }}
                              disabled={isDiscount || isSettled || remaining <= 0}
                              className="h-8 w-24 text-right text-sm"
                              placeholder="0"
                              max={remaining}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t bg-muted/30">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 font-semibold text-right">Total Allocating:</td>
                      <td colSpan={2} className="px-3 py-2 text-right text-lg font-bold text-primary">{totalAllocated.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Quick allocate buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const newAlloc: Record<string, number> = {};
                    let budget = totalRemaining;
                    for (const p of displayParticulars) {
                      if (budget <= 0) break;
                      const remaining = p.amount - p.paid_amount;
                      const isDiscount = p.label.toUpperCase().includes("DISCOUNT");
                      const isSettled = p.status === "paid" || p.status === "waived";
                      if (!isDiscount && !isSettled && remaining > 0) {
                        const allocAmount = Math.min(remaining, budget);
                        newAlloc[p.label] = allocAmount;
                        budget -= allocAmount;
                      }
                    }
                    setAllocations(newAlloc);
                  }}
                >
                  Allocate Full
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAllocations({})}>
                  Clear All
                </Button>
                {totalRemaining > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Remaining after payment: {(totalRemaining - totalAllocated).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Payment note */}
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Note (optional)</Label>
                <Input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Cash, Cheque #123, Bank Transfer..."
                  className="h-8 text-sm"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
                <Button
                  className="gap-2"
                  disabled={totalAllocated <= 0 || collectMutation.isPending}
                  onClick={() => collectMutation.mutate()}
                >
                  {collectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Record Payment ({totalAllocated.toLocaleString()})
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Print invoice prompt after payment */}
      <Dialog open={!!printInvoiceId} onOpenChange={(o) => { if (!o) setPrintInvoiceId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                <Printer className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <DialogTitle>Print Invoice?</DialogTitle>
                <DialogDescription>
                  Payment recorded. Would you like to print the invoice now?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPrintInvoiceId(null)}>Not Now</Button>
            <Button
              className="gap-2"
              onClick={() => {
                if (printInvoiceId) {
                  window.open(`/school/fees/invoices?ids=${printInvoiceId}`, "_blank");
                }
                setPrintInvoiceId(null);
              }}
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment history dialog */}
      <Dialog open={historyOpen} onOpenChange={(o) => { if (!o) { setHistoryOpen(false); setHistoryInvoice(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle>Payment History</DialogTitle>
                <DialogDescription>
                  {historyInvoice?.invoice_no} — {historyInvoice?.student_name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : paymentHistory && paymentHistory.length > 0 ? (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {paymentHistory.map((pay) => {
                const breakdown = typeof pay.particular_breakdown === "string"
                  ? JSON.parse(pay.particular_breakdown) as FeeAllocation[]
                  : (pay.particular_breakdown ?? []) as FeeAllocation[];
                return (
                  <div key={pay.id} className="group rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{pay.amount.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(pay.payment_date).toLocaleDateString()}
                      </span>
                    </div>
                    {breakdown.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {breakdown.map((b, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{b.label}</span>
                            <span className="font-medium">{b.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {pay.note && (
                      <p className="text-xs text-muted-foreground mt-1">{pay.note}</p>
                    )}
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100"
                        disabled={deletePaymentMutation.isPending}
                        onClick={() => deletePaymentMutation.mutate(pay.id)}
                        title="Delete payment — restores invoice to previous state"
                      >
                        {deletePaymentMutation.isPending && deletePaymentMutation.variables === pay.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No payments recorded yet.</p>
          )}
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
          <h1 className="text-2xl font-semibold tracking-tight">Collect Fees</h1>
          <p className="text-sm text-muted-foreground">
            Search for invoices and collect fees with per-particular allocation. Partial payments supported.
          </p>
        </div>

        {/* Search card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Search className="h-4 w-4 text-muted-foreground" />
              Search Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search by name, reg no, father CNIC, mobile, or invoice no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-80"
              />
              <Select value={feeMonth || "all"} onValueChange={(v) => { setFeeMonth(v === "all" ? "" : v); setPage(1); }}>
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
              <>
                <p className="text-xs text-muted-foreground">{invoicesData.total} invoice(s) found</p>
                <div className="space-y-2">
                  {invoicesData.data.map((inv, idx) => (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.02 }}
                      className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className={"flex h-9 w-9 items-center justify-center rounded-md shrink-0 " + statusBgClass(inv.status)}>
                        {inv.status === "paid" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : inv.status === "partial" ? (
                          <Clock className="h-4 w-4 text-amber-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{inv.invoice_no}</span>
                          <span className={"inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium " + statusBadgeClass(inv.status)}>
                            {inv.status}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                          {inv.student_name} · {inv.class_name ?? "No class"} · {inv.fee_month}
                        </p>
                        {inv.status !== "unpaid" && (
                          <p className="text-xs text-muted-foreground">
                            Paid: {getInvoicePaid(inv).toLocaleString()} / {getInvoiceTotal(inv).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-semibold text-sm">{getInvoiceTotal(inv).toLocaleString()}</span>
                        {inv.status === "paid" ? (
                          <span className="text-xs text-green-600 font-medium">Paid</span>
                        ) : (
                          <span className="text-xs text-orange-600">
                            Due: {getInvoiceRemaining(inv).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openHistory(inv)}
                          title="Payment History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        {inv.status !== "paid" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => openPayDialog(inv)}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Collect
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {invoicesData.total > 25 && (
                  <div className="flex items-center justify-between pt-3">
                    <p className="text-xs text-muted-foreground">
                      Page {page} of {Math.ceil(invoicesData.total / 25)}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= Math.ceil(invoicesData.total / 25)} onClick={() => setPage(page + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : debouncedSearch.trim().length > 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No invoices found. Try a different search.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Search by name, reg no, father CNIC, mobile, or invoice number to find invoices.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
