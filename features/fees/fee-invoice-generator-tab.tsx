"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Loader2,
  FileText,
  Download,
  Users,
  User,
  Layers,
  Eye,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toast";
import type { FeeInvoice, FeeParticular, SchoolClass, CustomParticular } from "@/types/school.types";

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

async function fetchFeeParticulars(schoolId: string): Promise<FeeParticular[]> {
  const res = await fetch(`/api/fees/${schoolId}/particulars`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load particulars");
  return json.data ?? [];
}

async function fetchStudentForParticulars(
  schoolId: string,
  studentId: string
): Promise<{ previous_balance: number; previous_annual_due: number; discount: number; class_fee: number }> {
  const res = await fetch(`/api/students/${schoolId}/${studentId}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load student");
  const s = json.data;
  if (!s) throw new Error("Student not found");
  return {
    previous_balance: s.previous_balance ?? 0,
    previous_annual_due: s.previous_annual_due ?? 0,
    discount: s.discount ?? 0,
    class_fee: s.class_fee ?? 0,
  };
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
  const [feeMonth, setFeeMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dueDate, setDueDate] = React.useState(addDays(todayISO(), 10));
  const [pickedStudents, setPickedStudents] = React.useState<PickedStudent[]>([]);

  const [generatedInvoices, setGeneratedInvoices] = React.useState<FeeInvoice[] | null>(null);
  const [showGenerated, setShowGenerated] = React.useState(false);

  const monthOptions = React.useMemo(() => getMonthOptions(), []);

  const { data: classes } = useQuery({
    queryKey: ["classes-for-invoices", schoolId],
    queryFn: () => fetchClasses(schoolId),
  });

  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editParticulars, setEditParticulars] = React.useState<CustomParticular[]>([]);
  const [editLoading, setEditLoading] = React.useState(false);

  const { data: feeParticulars } = useQuery({
    queryKey: ["fee-particulars-for-gen", schoolId],
    queryFn: () => fetchFeeParticulars(schoolId),
  });

  const generateMutation = useMutation({
    mutationFn: (customParticulars?: CustomParticular[]) => {
      const payload: Record<string, unknown> = {
        mode,
        fee_month: feeMonth,
        due_date: dueDate,
      };
      if (mode === "class") payload.class_id = classId;
      if (mode === "student") payload.student_ids = pickedStudents.map((s) => s.id);
      if (customParticulars) payload.custom_particulars = customParticulars;
      return generateInvoicesApi(schoolId, payload);
    },
    onSuccess: (data) => {
      if (data.length === 0) {
        toast({ title: "All students already have invoices for this month", variant: "default" });
        return;
      }
      setGeneratedInvoices(data);
      setShowGenerated(true);
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


  function canGenerate(): boolean {
    if (!feeMonth || !dueDate) return false;
    if (mode === "class" && !classId) return false;
    if (mode === "student" && pickedStudents.length === 0) return false;
    return true;
  }

  function resolveParticularForEdit(
    particulars: FeeParticular[],
    student: { previous_balance: number; previous_annual_due: number; discount: number; class_fee: number }
  ): CustomParticular[] {
    return particulars.map((p) => {
      let amount = p.amount;
      if (p.is_fixed && p.source_type) {
        switch (p.source_type) {
          case "class.fee": amount = student.class_fee; break;
          case "student.previous_annual_due": amount = student.previous_annual_due; break;
          case "student.previous_balance": amount = student.previous_balance; break;
          case "student.discount": amount = student.discount; break;
          default: amount = 0;
        }
      }
      return {
        label: p.label,
        amount,
        is_fixed: p.is_fixed,
        source_type: p.source_type,
        add_to_balance: true,
      };
    });
  }

  async function openEditDialog() {
    if (!feeParticulars || pickedStudents.length === 0) return;
    setEditLoading(true);
    setEditDialogOpen(true);
    try {
      const studentData = await fetchStudentForParticulars(schoolId, pickedStudents[0].id);
      const resolved = resolveParticularForEdit(feeParticulars, studentData);
      setEditParticulars(resolved);
    } catch {
      // Fallback: use raw particulars without resolution
      const fallback = feeParticulars
        .map((p) => ({
          label: p.label,
          amount: p.amount,
          is_fixed: p.is_fixed,
          source_type: p.source_type,
          add_to_balance: true,
        }));
      setEditParticulars(fallback);
    }
    setEditLoading(false);
  }

  function updateParticularAmount(idx: number, amount: number) {
    setEditParticulars(prev => prev.map((p, i) => i === idx ? { ...p, amount } : p));
  }

  function toggleAddToBalance(idx: number) {
    setEditParticulars(prev => prev.map((p, i) => i === idx ? { ...p, add_to_balance: !p.add_to_balance } : p));
  }

  function removeParticular(idx: number) {
    setEditParticulars(prev => prev.filter((_, i) => i !== idx));
  }

  function addParticular() {
    setEditParticulars(prev => [...prev, {
      label: "NEW FEE",
      amount: 0,
      is_fixed: false,
      source_type: null,
      add_to_balance: false,
    }]);
  }

  function updateParticularLabel(idx: number, label: string) {
    setEditParticulars(prev => prev.map((p, i) => i === idx ? { ...p, label } : p));
  }

  function calculateEditTotal(): number {
    return editParticulars.reduce((sum, p) => {
      const isDiscount = p.label.toUpperCase().includes("DISCOUNT");
      return sum + (isDiscount ? -Math.abs(p.amount) : p.amount);
    }, 0);
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

      {/* Edit particulars dialog (student-wise mode) */}
      <Dialog open={editDialogOpen} onOpenChange={(o) => { if (!o) setEditDialogOpen(false); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Pencil className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Edit Fee Particulars</DialogTitle>
                <DialogDescription>
                  Adjust amounts, add one-time fees, or mark items to add to student balance.
                  Applies to {pickedStudents.length} student(s).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="max-h-[50vh] overflow-y-auto space-y-2">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_100px_80px_36px] gap-2 px-1 text-xs font-medium text-muted-foreground">
                  <span>Label</span>
                  <span className="text-right">Amount</span>
                  <span className="text-center">To Balance</span>
                  <span></span>
                </div>

                {editParticulars.map((p, idx) => {
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_100px_80px_36px] gap-2 items-center rounded-lg border p-2"
                    >
                      <Input
                        value={p.label}
                        onChange={(e) => updateParticularLabel(idx, e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        value={p.amount}
                        onChange={(e) => updateParticularAmount(idx, parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm text-right"
                      />
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={p.add_to_balance ?? false}
                          onChange={() => toggleAddToBalance(idx)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300"
                          title="Add this amount to student's previous balance after generation"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70 hover:text-destructive"
                        onClick={() => removeParticular(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 mt-2"
                  onClick={addParticular}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Particular
                </Button>

                {/* Total */}
                <div className="flex items-center justify-between border-t pt-3 mt-3">
                  <span className="text-sm font-medium">Total Payable</span>
                  <span className="text-lg font-bold">
                    {calculateEditTotal().toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Tip: Check &quot;To Balance&quot; for one-time fees (e.g. Admission Fee) —
                  the amount will be added to the student&apos;s previous balance so it
                  doesn&apos;t recur in future invoices.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="gap-2"
                  disabled={generateMutation.isPending}
                  onClick={() => {
                    generateMutation.mutate(editParticulars);
                    setEditDialogOpen(false);
                  }}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Generate with Edited Particulars
                </Button>
              </DialogFooter>
            </>
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
                <SearchableSelect
                  value={classId}
                  onChange={setClassId}
                  options={(classes ?? []).map((classItem) => ({
                    value: classItem.id,
                    label: classItem.name,
                    subtitle: `Fee: ${classItem.fee.toLocaleString()}`,
                  }))}
                  placeholder="Choose a class..."
                  searchPlaceholder="Search classes..."
                />
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
              {mode === "student" && (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!canGenerate() || generateMutation.isPending || editLoading}
                  onClick={openEditDialog}
                >
                  <Pencil className="h-4 w-4" />
                  Edit & Generate
                </Button>
              )}
              <Button
                className="gap-2"
                disabled={!canGenerate() || generateMutation.isPending}
                onClick={() => generateMutation.mutate(undefined)}
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

      </motion.div>
    </>
  );
}
