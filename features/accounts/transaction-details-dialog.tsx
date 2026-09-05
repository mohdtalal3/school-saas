"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, History, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAdminShell } from "@/components/layout/admin-shell";
import { formatCurrency } from "@/lib/accounts";
import {
  fetchTransactionDetail,
  deleteAttachmentApi,
} from "./api";
import { TransactionAttachmentList } from "./transaction-attachment-uploader";
import type { FinancialTransaction } from "@/types/school.types";

interface TransactionDetailsDialogProps {
  schoolId: string;
  transaction: FinancialTransaction | null;
  onClose: () => void;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

export function TransactionDetailsDialog({
  schoolId,
  transaction,
  onClose,
}: TransactionDetailsDialogProps) {
  const { toast } = useToast();
  const { school } = useAdminShell();
  const currencySymbol = school?.currency_symbol ?? "$";
  const [deletingAttachmentId, setDeletingAttachmentId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["transaction-detail", schoolId, transaction?.id],
    queryFn: () => fetchTransactionDetail(schoolId, transaction!.id),
    enabled: !!transaction,
  });

  const removeAttachment = (attachmentId: string) => {
    if (!transaction) return;
    setDeletingAttachmentId(attachmentId);
    fetch(
      `/api/accounts/${schoolId}/transactions/${transaction.id}/attachments/${attachmentId}`,
      { method: "DELETE" }
    )
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to remove");
        return json;
      })
      .then(() => {
        toast({ title: "Attachment removed", variant: "success" });
      })
      .catch((e) => {
        toast({
          title: "Failed to remove attachment",
          description: e instanceof Error ? e.message : "Try again",
          variant: "destructive",
        });
      })
      .finally(() => setDeletingAttachmentId(null));
  };

  if (!transaction) return null;

  const isIncome = transaction.type === "income";
  const accent = isIncome ? "text-emerald-700" : "text-rose-700";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className={accent}>
            {isIncome ? "Income" : "Expense"} {transaction.transaction_number}
          </DialogTitle>
          <DialogDescription>
            Recorded {new Date(transaction.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading details...</div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Date" value={transaction.transaction_date} />
              <Detail
                label="Amount"
                value={
                  <span className={accent}>
                    {isIncome ? "+" : "−"}
                    {formatCurrency(transaction.amount, currencySymbol)}
                  </span>
                }
              />
              <Detail
                label="Type"
                value={
                  <span
                    className={
                      isIncome
                        ? "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        : "inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700"
                    }
                  >
                    {isIncome ? "Income" : "Expense"}
                  </span>
                }
              />
              <Detail label="Category" value={transaction.category_name ?? "—"} />
              <Detail label="Payment method" value={transaction.payment_method} />
              <Detail label="Reference" value={transaction.reference_number || "—"} />
              <Detail
                label={isIncome ? "Payer / source" : "Paid to / vendor"}
                value={transaction.party_name || "—"}
              />
              <Detail label="Status" value={transaction.status === "active" ? "Active" : "Void"} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="mt-1 text-sm">{transaction.description || "—"}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Attachments
              </p>
              <div className="mt-2">
                <TransactionAttachmentList
                  schoolId={schoolId}
                  transactionId={transaction.id}
                  attachments={data?.attachments ?? []}
                  onDelete={removeAttachment}
                  deletingId={deletingAttachmentId}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Created by" value={transaction.created_by_name || "—"} />
              <Detail
                label="Last updated"
                value={new Date(transaction.updated_at).toLocaleString()}
              />
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Audit history
              </p>
              {(data?.audit?.length ?? 0) === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No audit entries.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data!.audit.map((entry) => (
                    <li key={entry.id} className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium capitalize">{entry.action.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      {entry.field_name && (
                        <div className="mt-0.5 text-muted-foreground">
                          {entry.field_name}
                          {entry.previous_value !== null && (
                            <>
                              : <span className="line-through">{entry.previous_value || "(empty)"}</span>
                              {" → "}
                            </>
                          )}
                          {entry.new_value !== null && <span>{entry.new_value || "(empty)"}</span>}
                        </div>
                      )}
                      {entry.changed_by_name && (
                        <div className="mt-0.5 text-muted-foreground">by {entry.changed_by_name}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
