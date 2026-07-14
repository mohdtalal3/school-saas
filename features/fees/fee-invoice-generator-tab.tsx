"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  FileText,
  Download,
  Users,
  User,
  Layers,
  Calendar,
  AlertTriangle,
  Trash2,
  Eye,
  CheckCircle2,
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
import { SearchPicker } from "@/components/ui/search-picker";
import { useToast } from "@/components/ui/toast";
import type { FeeInvoice, SchoolClass } from "@/types/school.types";

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchClasses(schoolId: string): Promise<SchoolClass[]> {
  const res = await fetch(`/api/classes/${schoolId}?limit=1000`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data?.data ?? [];
}

async function searchStudentsForPicker(
  schoolId: string,
  query: string
): Promise<{ id: string; name: string; subtitle?: string }[]> {
  const qs = new URLSearchParams({ page: "1", limit: "20", search: query });
  const res = await fetch(`/api/students/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return (json.data.data as { id: string; name: string; registration_no: string | null; class_name: string | null }[]).map((s) => ({
    id: s.id,
    name: s.name,
    subtitle: `${s.registration_no ?? ""}${s.class_name ? ` · ${s.class_name}` : ""}`,
  }));
}

async function generateInvoicesApi(
  schoolId: string,
  payload: Record<string, unknown>
): Promise<FeeInvoice[]> {
  const res = await fetch(`/api/fees/${schoolId}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate");
  return data.data;
}

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

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── Component ──────────────────────────────────────────────────────────────────

interface FeeInvoiceGeneratorTabProps {
  schoolId: string;
}

type GenMode = "class" | "student" | "all-classes";

interface PickedStudent {
  id: string;
  name: string;
  subtitle?: string;
}

export function FeeInvoiceGeneratorTab({ schoolId }: FeeInvoiceGeneratorTabProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [mode, setMode] = React.useState<GenMode>("class");
  const [classId, setClassId] = React.useState("");
  const [feeMonth, setFeeMonth] = React.useState("");
  const [dueDate, setDueDate] = React.useState(addDays(todayISO(), 10));
  const [pickedStudents, setPickedStudents] = React.useState<PickedStudent[]>([]);

  const [generatedInvoices, setGeneratedInvoices] = React.useState<FeeInvoice[] | null>(null);
  const [showGenerated, setShowGenerated] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FeeInvoice | null>(null);

  // Search state for invoice lookup (separate from generation form)
  const [invoiceSearch, setInvoiceSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [invoiceMonth, setInvoiceMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [page, setPage] = React.useState(1);

  const monthOptions = React.useMemo(() => getMonthOptions(), []);

  // Debounce search (300ms)
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(invoiceSearch);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [invoiceSearch]);

  const invoiceQueryKey = ["fee-invoices", schoolId, { page, limit: 25, debouncedSearch, invoiceMonth }];

  const { data: classes } = useQuery({
    queryKey: ["classes-for-invoices", schoolId],
    queryFn: () => fetchClasses(schoolId),
  });

  const hasSearched = debouncedSearch.trim().length > 0;

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: invoiceQueryKey,
    queryFn: () => fetchInvoices(schoolId, { page, limit: 25, search: debouncedSearch || undefined, feeMonth: invoiceMonth || undefined }),
    enabled: hasSearched,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        mode,
        fee_month: feeMonth,
        due_date: dueDate,
      };
      if (mode === "class") payload.class_id = classId;
      if (mode === "student") payload.student_ids = pickedStudents.map((s) => s.id);
      return generateInvoicesApi(schoolId, payload);
    },
    onSuccess: (data) => {
      setGeneratedInvoices(data);
      setShowGenerated(true);
      qc.invalidateQueries({ queryKey: invoiceQueryKey });
      toast({ title: `${data.length} invoice(s) generated`, variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoiceApi(schoolId, deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceQueryKey });
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

  function canGenerate(): boolean {
    if (!feeMonth || !dueDate) return false;
    if (mode === "class" && !classId) return false;
    if (mode === "student" && pickedStudents.length === 0) return false;
    return true;
  }

  function downloadPdf(opts: { ids?: string[]; allClasses?: boolean; search?: string; feeMonth?: string }) {
    const params = new URLSearchParams();
    if (opts.allClasses) {
      params.set("allClasses", "1");
      if (opts.feeMonth) params.set("feeMonth", opts.feeMonth);
    } else if (opts.ids && opts.ids.length > 0) {
      params.set("ids", opts.ids.join(","));
    } else if (opts.search || opts.feeMonth) {
      if (opts.search) params.set("search", opts.search);
      if (opts.feeMonth) params.set("feeMonth", opts.feeMonth);
    }
    window.open(`/school/fees/invoices?${params.toString()}`, "_blank");
  }

  function previewPdf(opts: { ids?: string[]; allClasses?: boolean; search?: string; feeMonth?: string }) {
    downloadPdf(opts);
  }

  const modeTabs: { value: GenMode; label: string; icon: React.ElementType }[] = [
    { value: "class", label: "Class Wise", icon: Users },
    { value: "student", label: "Student Wise", icon: User },
    { value: "all-classes", label: "All Classes", icon: Layers },
  ];

  return (
    <>
      {/* Generated invoices dialog */}
      <Dialog open={showGenerated} onOpenChange={(o) => { if (!o) setShowGenerated(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <DialogTitle>Invoices Generated Successfully</DialogTitle>
                <DialogDescription>
                  {generatedInvoices?.length} invoice(s) created for {feeMonth}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-1.5">
            {generatedInvoices?.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                <div>
                  <span className="font-semibold">{inv.invoice_no}</span>
                  <span className="text-muted-foreground"> — {inv.student_name}</span>
                  {inv.class_name && <span className="text-muted-foreground"> · {inv.class_name}</span>}
                </div>
                <span className="font-semibold text-sm">{inv.total_amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowGenerated(false)}>Close</Button>
            <Button
              className="gap-2"
              onClick={() => downloadPdf({ ids: generatedInvoices?.map((i) => i.id) ?? [] })}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <h1 className="text-2xl font-semibold tracking-tight">Invoice Generator</h1>
          <p className="text-sm text-muted-foreground">
            Generate fee invoices for classes or individual students.
          </p>
        </div>

        {/* Mode tabs */}
        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          {modeTabs.map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setMode(tab.value);
                  setClassId("");
                  setPickedStudents([]);
                }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Generate form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Generate Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Class selection (class mode) */}
            {mode === "class" && (
              <div className="space-y-1.5">
                <Label>Select Class</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} (Fee: {c.fee.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Student selection (student mode) */}
            {mode === "student" && (
              <div className="space-y-2">
                <Label>Select Students</Label>
                <SearchPicker
                  placeholder="Search student by name or reg no..."
                  searchFn={(q) => searchStudentsForPicker(schoolId, q)}
                  queryKey={(q) => ["student-search", schoolId, q] as const}
                  onSelect={(item) => {
                    if (!pickedStudents.find((s) => s.id === item.id)) {
                      setPickedStudents([...pickedStudents, { id: item.id, name: item.name, subtitle: item.subtitle }]);
                    }
                  }}
                />
                {pickedStudents.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pickedStudents.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium"
                      >
                        {s.name}
                        {s.subtitle && <span className="text-muted-foreground">· {s.subtitle}</span>}
                        <button
                          onClick={() => setPickedStudents(pickedStudents.filter((p) => p.id !== s.id))}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* All classes info */}
            {mode === "all-classes" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <Layers className="inline h-4 w-4 mr-2" />
                Invoices will be generated for all active students across all classes.
              </div>
            )}

            {/* Common fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fee Month</Label>
                <Select value={feeMonth} onValueChange={setFeeMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month..." />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Generate button */}
            <div className="flex justify-end gap-2 pt-2">
              {mode === "all-classes" && feeMonth && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => previewPdf({ allClasses: true, feeMonth })}
                >
                  <Eye className="h-4 w-4" />
                  Preview All Classes PDF
                </Button>
              )}
              <Button
                className="gap-2"
                disabled={!canGenerate() || generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Generate Invoices
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search invoices */}
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
              {invoicesData && invoicesData.data.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-2"
                  onClick={() => downloadPdf({ search: debouncedSearch || undefined, feeMonth: invoiceMonth || undefined })}
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
                value={invoiceSearch}
                onChange={(e) => { setInvoiceSearch(e.target.value); }}
                className="w-full sm:w-72"
              />
              <Select value={invoiceMonth} onValueChange={(v) => { setInvoiceMonth(v === "all" ? "" : v); setPage(1); }}>
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

            {invoicesLoading ? (
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
                    </div>
                    <span className="font-semibold text-sm shrink-0">
                      {inv.total_amount.toLocaleString()}
                    </span>
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => previewPdf({ ids: [inv.id] })}
                        title="Preview PDF"
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
