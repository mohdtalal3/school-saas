"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  Wallet,
  Loader2,
  CheckCircle2,
  Receipt,
  X,
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
import { useToast } from "@/components/ui/toast";
import { SearchPicker } from "@/components/ui/search-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { StudentWithClass } from "@/types/school.types";

async function searchStudentsForPicker(
  schoolId: string,
  query: string
): Promise<{ id: string; name: string; photo_url?: string | null; subtitle?: string }[]> {
  const qs = new URLSearchParams({ page: "1", limit: "20", search: query });
  const res = await fetch(`/api/students/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return (json.data.data as StudentWithClass[]).map((s) => ({
    id: s.id,
    name: s.name,
    photo_url: s.photo_url,
    subtitle: `${s.registration_no ?? "No Reg"}${s.class_name ? ` · ${s.class_name}` : ""}`,
  }));
}

async function fetchStudentAnnualDue(
  schoolId: string,
  studentId: string
): Promise<{ previous_annual_due: number; name: string; registration_no: string; class_name: string | null }> {
  const res = await fetch(`/api/students/${schoolId}/${studentId}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  const s = json.data as StudentWithClass;
  return {
    previous_annual_due: s.previous_annual_due ?? 0,
    name: s.name,
    registration_no: s.registration_no ?? "",
    class_name: s.class_name ?? null,
  };
}

async function payAnnualDueApi(
  schoolId: string,
  studentId: string,
  amount: number
): Promise<{ student_id: string; previous_annual_due: number }> {
  const res = await fetch(`/api/students/${schoolId}/pay-annual-due`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id: studentId, amount }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to pay");
  return data.data;
}

interface PayAnnualDuesTabProps {
  schoolId: string;
}

export function PayAnnualDuesTab({ schoolId }: PayAnnualDuesTabProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedStudent, setSelectedStudent] = React.useState<{ id: string; name: string; photo_url?: string | null; subtitle?: string } | null>(null);
  const [payDialogOpen, setPayDialogOpen] = React.useState(false);
  const [payAmount, setPayAmount] = React.useState(0);

  const { data: studentInfo, isLoading: studentLoading } = useQuery({
    queryKey: ["student-annual-due", schoolId, selectedStudent?.id],
    queryFn: () => fetchStudentAnnualDue(schoolId, selectedStudent!.id),
    enabled: !!selectedStudent,
  });

  const payMutation = useMutation({
    mutationFn: () => {
      if (!selectedStudent) throw new Error("No student selected");
      return payAnnualDueApi(schoolId, selectedStudent.id, payAmount);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["student-annual-due", schoolId, selectedStudent?.id] });
      qc.invalidateQueries({ queryKey: ["students", schoolId] });
      setPayDialogOpen(false);
      setPayAmount(0);
      toast({
        title: "Annual due payment recorded",
        description: `Remaining annual due: ${data.previous_annual_due.toLocaleString()}`,
        variant: "success",
      });
    },
    onError: (e) => {
      toast({
        title: "Payment failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  function openPayDialog() {
    const annualDue = studentInfo?.previous_annual_due ?? 0;
    setPayAmount(annualDue);
    setPayDialogOpen(true);
  }

  const annualDue = studentInfo?.previous_annual_due ?? 0;

  return (
    <>
      {/* Pay dialog */}
      <Dialog open={payDialogOpen} onOpenChange={(o) => { if (!o) { setPayDialogOpen(false); setPayAmount(0); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Pay Annual Due</DialogTitle>
                <DialogDescription>
                  {selectedStudent?.name} — {selectedStudent?.subtitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current annual due */}
            <div className="rounded-lg border p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Annual Due</span>
                <span className="text-lg font-bold">{annualDue.toLocaleString()}</span>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Amount Paying</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-12 text-xl font-bold text-right text-primary"
                placeholder="Enter amount"
              />
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setPayAmount(annualDue)}
                >
                  Full
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setPayAmount(Math.round(annualDue / 2))}
                >
                  Half
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setPayAmount(0)}
                >
                  Clear
                </Button>
              </div>
            </div>

            {payAmount > 0 && payAmount < annualDue && (
              <div className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2">
                <span className="text-sm text-orange-700">Remaining After Payment</span>
                <span className="font-semibold text-orange-700">
                  {(annualDue - payAmount).toLocaleString()}
                </span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
              <Button
                className="gap-2"
                disabled={payAmount <= 0 || payMutation.isPending}
                onClick={() => payMutation.mutate()}
              >
                {payMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Record Payment
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Pay Annual Dues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <SearchPicker
            placeholder="Type at least 3 letters to search students..."
            searchFn={(q) => searchStudentsForPicker(schoolId, q)}
            queryKey={(q) => ["students-search", schoolId, q] as const}
            emptyHint={{
              icon: <Wallet className="h-7 w-7 text-muted-foreground" />,
              title: "Search for a student",
              description: "Find a student to view and pay their annual dues.",
            }}
            onSelect={(item) => setSelectedStudent(item)}
          />

          {selectedStudent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {selectedStudent.photo_url && (
                          <AvatarImage src={selectedStudent.photo_url} alt={selectedStudent.name} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(selectedStudent.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base font-medium">{selectedStudent.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{selectedStudent.subtitle}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setSelectedStudent(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {studentLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Previous Annual Due</p>
                          <p className="text-2xl font-bold text-primary">{annualDue.toLocaleString()}</p>
                        </div>
                        <Button
                          className="gap-2"
                          onClick={openPayDialog}
                          disabled={annualDue <= 0}
                        >
                          <Wallet className="h-4 w-4" />
                          Pay Annual Due
                        </Button>
                      </div>
                      {annualDue <= 0 && (
                        <p className="text-sm text-muted-foreground text-center">
                          No outstanding annual due for this student.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!selectedStudent && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Receipt className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium">Pay Annual Dues</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Search for a student above to view and collect their annual dues separately from monthly fees.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
