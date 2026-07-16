"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Lock,
  Coins,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { FeeParticular } from "@/types/school.types";

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchParticulars(
  schoolId: string
): Promise<FeeParticular[]> {
  const res = await fetch(`/api/fees/${schoolId}/particulars`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

async function createParticularApi(
  schoolId: string,
  payload: { label: string; amount: number }
): Promise<FeeParticular> {
  const res = await fetch(`/api/fees/${schoolId}/particulars`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to create");
  return data.data;
}

async function updateParticularApi(
  schoolId: string,
  particularId: string,
  payload: Partial<FeeParticular>
): Promise<FeeParticular> {
  const res = await fetch(`/api/fees/${schoolId}/particulars/${particularId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to update");
  return data.data;
}

async function deleteParticularApi(
  schoolId: string,
  particularId: string
): Promise<void> {
  const res = await fetch(`/api/fees/${schoolId}/particulars/${particularId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete");
}

// ── Source type labels ─────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  "class.fee": "Class Fee",
  "student.previous_balance": "Student Previous Balance",
  "student.discount": "Student Discount",
  "student.previous_annual_due": "Student Previous Annual Due",
  "student.annual_dues_discount": "Student Annual Dues Discount",
};

// ── Component ──────────────────────────────────────────────────────────────────

interface FeeParticularsTabProps {
  schoolId: string;
}

type DialogMode = "add" | "edit" | "delete";

export function FeeParticularsTab({ schoolId }: FeeParticularsTabProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [mode, setMode] = React.useState<DialogMode | null>(null);
  const [selected, setSelected] = React.useState<FeeParticular | null>(null);
  const [editLabel, setEditLabel] = React.useState("");
  const [editAmount, setEditAmount] = React.useState("0");
  const [addLabel, setAddLabel] = React.useState("");
  const [addAmount, setAddAmount] = React.useState("0");

  const queryKey = ["fee-particulars", schoolId];

  const { data: particulars, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchParticulars(schoolId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { label: string; amount: number }) =>
      createParticularApi(schoolId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setMode(null);
      setAddLabel("");
      setAddAmount("0");
      toast({ title: "Fee particular added", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Failed to add",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<FeeParticular>) =>
      updateParticularApi(schoolId, selected!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setMode(null);
      setSelected(null);
      toast({ title: "Fee particular updated", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteParticularApi(schoolId, selected!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setMode(null);
      setSelected(null);
      toast({ title: "Fee particular removed", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  function openEdit(p: FeeParticular) {
    setSelected(p);
    setEditLabel(p.label);
    setEditAmount(String(p.amount));
    setMode("edit");
  }

  function openDelete(p: FeeParticular) {
    setSelected(p);
    setMode("delete");
  }

  function closeDialog() {
    setMode(null);
    setSelected(null);
  }

  const fixedCount = particulars?.filter((p) => p.is_fixed).length ?? 0;
  const customCount = particulars?.filter((p) => !p.is_fixed).length ?? 0;

  return (
    <>
      {/* Delete confirmation dialog */}
      <Dialog open={mode === "delete"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Fee Particular?</DialogTitle>
                <DialogDescription>
                  {selected?.label} will be removed. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
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

      {/* Edit dialog */}
      <Dialog open={mode === "edit"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fee Particular</DialogTitle>
            <DialogDescription>
              Update the label and amount for this fee particular.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit_label">Particular Label</Label>
              <Input
                id="edit_label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="e.g. LAB FEE"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit_amount">
                Amount {selected?.is_fixed && "(Fixed — auto-resolved)"}
              </Label>
              <Input
                id="edit_amount"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                disabled={selected?.is_fixed}
                placeholder="0"
              />
              {selected?.is_fixed && (
                <p className="text-[10px] text-muted-foreground">
                  This particular is auto-resolved from {SOURCE_LABELS[selected.source_type ?? ""] ?? "student/class data"}.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => {
                updateMutation.mutate({
                  label: editLabel,
                  amount: selected?.is_fixed ? undefined : parseFloat(editAmount) || 0,
                });
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <Dialog open={mode === "add"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fee Particular</DialogTitle>
            <DialogDescription>
              Create a custom fee particular with a fixed amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add_label">Particular Label</Label>
              <Input
                id="add_label"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder="e.g. LAB FEE"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add_amount">Amount</Label>
              <Input
                id="add_amount"
                type="number"
                step="0.01"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => {
                createMutation.mutate({
                  label: addLabel,
                  amount: parseFloat(addAmount) || 0,
                });
              }}
              disabled={createMutation.isPending || !addLabel.trim()}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Particular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fee Particulars</h1>
            <p className="text-sm text-muted-foreground">
              Configure fee line items applied to student invoices.
            </p>
          </div>
          <Button onClick={() => { setAddLabel(""); setAddAmount("0"); setMode("add"); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Particular
          </Button>
        </div>

        {/* Fee Particulars For selector */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium whitespace-nowrap">Fee Particulars For</Label>
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Particulars list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Coins className="h-4 w-4 text-muted-foreground" />
                Fee Particulars
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {particulars?.length ?? 0}
                </span>
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {fixedCount} fixed · {customCount} custom
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <AnimatePresence>
                  {particulars?.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.18, delay: idx * 0.02 }}
                      className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                    >
                      {/* Drag handle (visual only) */}
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{p.label}</p>
                          {p.is_fixed && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              <Lock className="h-2.5 w-2.5" />
                              FIXED
                            </span>
                          )}
                        </div>
                        {p.is_fixed && p.source_type && (
                          <p className="truncate text-[10px] text-muted-foreground mt-0.5">
                            Auto from {SOURCE_LABELS[p.source_type] ?? p.source_type}
                          </p>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="shrink-0 text-right">
                        {p.is_fixed ? (
                          <span className="text-sm font-medium text-muted-foreground italic">
                            Auto
                          </span>
                        ) : (
                          <span className="text-sm font-semibold">
                            {p.amount.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(p)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive"
                          onClick={() => openDelete(p)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {particulars?.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Coins className="mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No fee particulars configured.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </>
  );
}
