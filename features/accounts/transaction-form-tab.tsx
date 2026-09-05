"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAdminShell } from "@/components/layout/admin-shell";
import { PAYMENT_METHODS, formatCurrency } from "@/lib/accounts";
import {
  fetchCategories,
  createTransactionApi,
  uploadAttachmentApi,
} from "./api";
import { TransactionAttachmentUploader } from "./transaction-attachment-uploader";
import type { FinancialTransaction } from "@/types/school.types";

interface TransactionFormTabProps {
  schoolId: string;
  type: "income" | "expense";
}

export function TransactionFormTab({ schoolId, type }: TransactionFormTabProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { school } = useAdminShell();
  const currencySymbol = school?.currency_symbol ?? "$";

  const isIncome = type === "income";
  const [categoryId, setCategoryId] = React.useState("");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<string>("Cash");
  const [reference, setReference] = React.useState("");
  const [party, setParty] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [savedTransaction, setSavedTransaction] = React.useState<FinancialTransaction | null>(null);

  const { data: categoryData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["account-categories", schoolId, type, "", "active", "name", "asc"],
    queryFn: () =>
      fetchCategories(schoolId, { type, status: "active", sortBy: "name", sortDir: "asc" }),
  });
  const categories = categoryData?.data ?? [];

  const resetForm = () => {
    setCategoryId("");
    setAmount("");
    setReference("");
    setParty("");
    setDescription("");
    setFiles([]);
    setPaymentMethod("Cash");
  };

  const submit = async () => {
    const amountValue = Number(amount);
    if (!categoryId) {
      toast({ title: "Select a category", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a positive monetary value.",
        variant: "destructive",
      });
      return;
    }
    if (!date) {
      toast({ title: "Select a date", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const transaction = await createTransactionApi(schoolId, {
        type,
        category_id: categoryId,
        transaction_date: date,
        amount: amountValue,
        payment_method: paymentMethod,
        reference_number: reference.trim() || null,
        party_name: party.trim() || null,
        description: description.trim() || null,
      });

      for (const file of files) {
        await uploadAttachmentApi(schoolId, transaction.id, file);
      }

      qc.invalidateQueries({ queryKey: ["financial-statement", schoolId] });
      qc.invalidateQueries({ queryKey: ["accounts-quick-summary", schoolId] });
      setSavedTransaction(transaction);
      resetForm();
      toast({
        title: isIncome ? "Income recorded" : "Expense recorded",
        description: `${transaction.transaction_number} · ${formatCurrency(transaction.amount, currencySymbol)}`,
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Failed to save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2e1065]">
            {isIncome ? "Add Income" : "Add Expense"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isIncome
              ? "Record income received by the school."
              : "Record an expense paid by the school."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle
            className={
              isIncome
                ? "flex items-center gap-2 text-emerald-700"
                : "flex items-center gap-2 text-rose-700"
            }
          >
            {isIncome ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            {isIncome ? "Income Details" : "Expense Details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tx-date">{isIncome ? "Income" : "Expense"} date</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{isIncome ? "Income category" : "Expense category"}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-reference">Reference (optional)</Label>
              <Input
                id="tx-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Receipt / cheque / bank reference"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-party">
                {isIncome ? "Payer / source" : "Paid to / vendor"}
              </Label>
              <Input
                id="tx-party"
                value={party}
                onChange={(e) => setParty(e.target.value)}
                placeholder={isIncome ? "e.g. Parent name" : "e.g. Vendor name"}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tx-description">Description / notes</Label>
            <Textarea
              id="tx-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isIncome
                  ? "e.g. Summer task payment received from students."
                  : "e.g. Electricity bill for August"
              }
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Attachments</Label>
            <TransactionAttachmentUploader files={files} onChange={setFiles} disabled={submitting} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm} disabled={submitting}>
              Clear
            </Button>
            <Button
              onClick={submit}
              disabled={submitting || !categoryId || !amount || !(Number(amount) > 0)}
              className={isIncome ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {isIncome ? "Save Income" : "Record Expense"}
            </Button>
          </div>
          {savedTransaction && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {savedTransaction.transaction_number} saved successfully.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
