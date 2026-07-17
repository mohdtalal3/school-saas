import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FeeInvoice,
  InvoiceParticular,
  CollectFeePayload,
  FeePayment,
} from "@/types/school.types";
import { NotFoundError } from "@/lib/api-response";

// ── Collect fee (record payment with per-particular allocations) ──────────────

export async function collectFee(
  schoolId: string,
  payload: CollectFeePayload
): Promise<{ invoice: FeeInvoice; payment: FeePayment }> {
  const supabase: SupabaseClient = createSupabaseService();

  // 1. Fetch the invoice
  const { data: invoiceData, error: invError } = await supabase
    .from("fee_invoices")
    .select("*")
    .eq("id", payload.invoice_id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (invError) throw new Error(`Failed to fetch invoice: ${invError.message}`);
  if (!invoiceData) throw new NotFoundError("Invoice not found");

  const invoice = invoiceData as Record<string, unknown>;
  const studentId = invoice.student_id as string;
  const fineAfterDue = Number(invoice.fine_after_due ?? 0);

  // Parse particulars from JSONB
  const particularsRaw = invoice.particulars;
  const particulars = typeof particularsRaw === "string" ? JSON.parse(particularsRaw) : (particularsRaw ?? []);
  const parts = particulars as InvoiceParticular[];

  // If add_fine is true and there's a fine, add LATE FINE as a particular
  if (payload.add_fine && fineAfterDue > 0 && !parts.find((p) => p.label.toUpperCase().includes("FINE"))) {
    parts.push({ label: "LATE FINE", amount: fineAfterDue, paid_amount: 0, status: "unpaid", is_fixed: false, source_type: null });
  }

  // 2. Apply allocations to particulars
  const totalAllocated = payload.allocations.reduce((sum, a) => sum + a.amount, 0);
  if (totalAllocated <= 0) {
    throw new Error("Total allocated amount must be greater than 0");
  }

  for (const alloc of payload.allocations) {
    const part = parts.find((p) => p.label === alloc.label);
    if (!part) throw new Error(`Particular "${alloc.label}" not found on invoice`);
    if (alloc.amount < 0) throw new Error(`Allocation for "${alloc.label}" cannot be negative`);

    const remaining = part.amount - part.paid_amount;
    if (alloc.amount > remaining) {
      throw new Error(`Allocation for "${alloc.label}" (${alloc.amount}) exceeds remaining balance (${remaining})`);
    }

    part.paid_amount += alloc.amount;
    if (part.paid_amount >= part.amount) {
      part.status = "paid";
    } else if (part.paid_amount > 0) {
      part.status = "partial";
    }
  }

  // 3. Compute invoice-level totals
  const totalAmount = parts.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = parts.reduce((sum, p) => sum + p.paid_amount, 0);
  const totalWaived = parts.filter((p) => p.status === "waived").reduce((sum, p) => sum + (p.amount - p.paid_amount), 0);
  const allSettled = parts.every((p) => p.status === "paid" || p.status === "waived" || p.paid_amount >= p.amount);
  const anyPaid = parts.some((p) => p.paid_amount > 0);
  const invoiceStatus = allSettled ? "paid" : anyPaid ? "partial" : "unpaid";

  // 4. Update invoice with new particulars and totals
  const { error: updateError } = await supabase
    .from("fee_invoices")
    .update({
      particulars: JSON.stringify(parts),
      total_amount: totalAmount,
      paid_amount: totalPaid,
      waived_amount: totalWaived,
      status: invoiceStatus,
      payment_date: new Date().toISOString(),
      payment_note: payload.payment_note ?? null,
    })
    .eq("id", payload.invoice_id)
    .eq("school_id", schoolId);

  if (updateError) throw new Error(`Failed to update invoice: ${updateError.message}`);

  // 5. Insert payment record with particular_breakdown
  const { data: paymentData, error: payError } = await supabase
    .from("fee_payments")
    .insert({
      school_id: schoolId,
      invoice_id: payload.invoice_id,
      student_id: studentId,
      amount: totalAllocated,
      payment_date: new Date().toISOString(),
      note: payload.payment_note ?? null,
      particular_breakdown: JSON.stringify(payload.allocations),
    })
    .select("*")
    .single();

  if (payError) throw new Error(`Failed to record payment: ${payError.message}`);

  // 6. Handle previous balance: reduce by amount paid toward PREVIOUS BALANCE particular,
  //     then add unpaid non-carried charges (tuition, etc.) as new previous balance
  const prevBalancePaid = payload.allocations
    .filter((a) => a.label.toUpperCase().includes("PREVIOUS BALANCE"))
    .reduce((sum, a) => sum + a.amount, 0);

  const unpaidNonCarried = parts
    .filter((p) => {
      const label = p.label.toUpperCase();
      const isAnnualDue = (label.includes("ANNUAL DUE") || label.includes("PENDING ANNUAL DUES"));
      const isPrevBalance = label.includes("PREVIOUS BALANCE");
      return !isAnnualDue && !isPrevBalance && p.status !== "waived";
    })
    .reduce((sum, p) => sum + (p.amount - p.paid_amount), 0);

  if (prevBalancePaid > 0 || unpaidNonCarried > 0) {
    const { data: stu } = await supabase
      .from("students")
      .select("previous_balance")
      .eq("id", studentId)
      .single();

    const currentPrevBalance = Number((stu as Record<string, unknown>)?.previous_balance ?? 0);
    const newPrevBalance = Math.max(0, currentPrevBalance - prevBalancePaid + unpaidNonCarried);
    await supabase
      .from("students")
      .update({ previous_balance: newPrevBalance })
      .eq("id", studentId);
  }

  // 6b. Reduce student.previous_annual_due by the amount allocated toward annual dues
  const annualDueAllocated = payload.allocations
    .filter((a) => {
      const label = a.label.toUpperCase();
      return label.includes("ANNUAL DUE") || label.includes("PENDING ANNUAL DUES");
    })
    .reduce((sum, a) => sum + a.amount, 0);

  if (annualDueAllocated > 0) {
    const { data: stu } = await supabase
      .from("students")
      .select("previous_annual_due")
      .eq("id", studentId)
      .single();

    const currentAnnualDue = Number((stu as Record<string, unknown>)?.previous_annual_due ?? 0);
    const newAnnualDue = Math.max(0, currentAnnualDue - annualDueAllocated);
    await supabase
      .from("students")
      .update({ previous_annual_due: newAnnualDue })
      .eq("id", studentId);
  }

  // 7. Return updated invoice + payment
  const { data: updatedInvoice } = await supabase
    .from("fee_invoices")
    .select("*")
    .eq("id", payload.invoice_id)
    .single();

  return {
    invoice: (updatedInvoice ?? invoiceData) as unknown as FeeInvoice,
    payment: paymentData as unknown as FeePayment,
  };
}

// ── Get payment history for an invoice ─────────────────────────────────────────

export async function getPaymentHistory(
  schoolId: string,
  invoiceId: string
): Promise<FeePayment[]> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("fee_payments")
    .select("*")
    .eq("school_id", schoolId)
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false });

  if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
  return (data ?? []) as unknown as FeePayment[];
}

// ── Delete payment (reverse per-particular allocations) ───────────────────────

export async function deletePayment(
  schoolId: string,
  paymentId: string
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  // 1. Fetch the payment record
  const { data: paymentData, error: payError } = await supabase
    .from("fee_payments")
    .select("*")
    .eq("id", paymentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (payError) throw new Error(`Failed to fetch payment: ${payError.message}`);
  if (!paymentData) throw new NotFoundError("Payment not found");

  const payment = paymentData as Record<string, unknown>;
  const invoiceId = payment.invoice_id as string;
  const studentId = payment.student_id as string;

  // Parse the payment's particular_breakdown (what was allocated in this payment)
  const breakdownRaw = payment.particular_breakdown;
  const breakdown = typeof breakdownRaw === "string" ? JSON.parse(breakdownRaw) : (breakdownRaw ?? []);
  const allocations = breakdown as Array<{ label: string; amount: number }>;

  // 2. Fetch the invoice
  const { data: invoiceData, error: invError } = await supabase
    .from("fee_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (invError) throw new Error(`Failed to fetch invoice: ${invError.message}`);
  if (!invoiceData) throw new NotFoundError("Invoice not found");

  const invoice = invoiceData as Record<string, unknown>;

  // Parse particulars
  const particularsRaw = invoice.particulars;
  const particulars = typeof particularsRaw === "string" ? JSON.parse(particularsRaw) : (particularsRaw ?? []);
  const parts = particulars as InvoiceParticular[];

  // 3. Reverse each allocation from the payment
  for (const alloc of allocations) {
    const part = parts.find((p) => p.label === alloc.label);
    if (part) {
      part.paid_amount = Math.max(0, part.paid_amount - alloc.amount);
      if (part.paid_amount <= 0) {
        part.status = "unpaid";
      } else if (part.paid_amount < part.amount) {
        part.status = "partial";
      }
    }
  }

  // 4. Recompute invoice-level totals
  const totalAmount = parts.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = parts.reduce((sum, p) => sum + p.paid_amount, 0);
  const totalWaived = parts.filter((p) => p.status === "waived").reduce((sum, p) => sum + (p.amount - p.paid_amount), 0);
  const allSettled = parts.every((p) => p.status === "paid" || p.status === "waived" || p.paid_amount >= p.amount);
  const anyPaid = parts.some((p) => p.paid_amount > 0);
  const invoiceStatus = allSettled ? "paid" : anyPaid ? "partial" : "unpaid";

  // Check if there are any other payments for this invoice
  const { count: otherPaymentsCount } = await supabase
    .from("fee_payments")
    .select("*", { count: "exact", head: true })
    .eq("invoice_id", invoiceId)
    .neq("id", paymentId);

  const hasOtherPayments = (otherPaymentsCount ?? 0) > 0;

  await supabase
    .from("fee_invoices")
    .update({
      particulars: JSON.stringify(parts),
      total_amount: totalAmount,
      paid_amount: hasOtherPayments ? totalPaid : 0,
      waived_amount: totalWaived,
      status: hasOtherPayments ? invoiceStatus : "unpaid",
      payment_date: hasOtherPayments ? new Date().toISOString() : null,
      payment_note: hasOtherPayments ? (invoice.payment_note as string | null) : null,
    })
    .eq("id", invoiceId)
    .eq("school_id", schoolId);

  // 5. Reverse student balance:
  //    a) Re-add the amount that was paid toward PREVIOUS BALANCE (it was subtracted from student.previous_balance)
  //    b) Subtract the unpaid non-carried items that were added to student.previous_balance
  const prevBalancePaidReversed = allocations
    .filter((a) => a.label.toUpperCase().includes("PREVIOUS BALANCE"))
    .reduce((sum, a) => sum + a.amount, 0);

  const unpaidNonCarriedReversed = parts
    .filter((p) => {
      const label = p.label.toUpperCase();
      const isAnnualDue = (label.includes("ANNUAL DUE") || label.includes("PENDING ANNUAL DUES"));
      const isPrevBalance = label.includes("PREVIOUS BALANCE");
      return !isAnnualDue && !isPrevBalance && p.status !== "waived";
    })
    .reduce((sum, p) => {
      // After reversal, p.paid_amount is the amount from OTHER payments (before this one).
      // The amount that was carried forward by THIS payment = unpaid after this payment was applied
      // = (p.amount - p.paid_amount) - allocAmount
      const allocAmount = allocations.find((a) => a.label === p.label)?.amount ?? 0;
      return sum + Math.max(0, (p.amount - p.paid_amount) - allocAmount);
    }, 0);

  if (prevBalancePaidReversed > 0 || unpaidNonCarriedReversed > 0) {
    const { data: stu } = await supabase
      .from("students")
      .select("previous_balance")
      .eq("id", studentId)
      .single();

    const currentPrevBalance = Number((stu as Record<string, unknown>)?.previous_balance ?? 0);
    // Re-add prev balance that was paid, subtract unpaid that was carried forward
    const newPrevBalance = Math.max(0, currentPrevBalance + prevBalancePaidReversed - unpaidNonCarriedReversed);
    await supabase
      .from("students")
      .update({ previous_balance: newPrevBalance })
      .eq("id", studentId);
  }

  // 5b. Reverse annual dues reduction: increase student.previous_annual_due back
  const annualDueReversed = allocations
    .filter((a) => {
      const label = a.label.toUpperCase();
      return label.includes("ANNUAL DUE") || label.includes("PENDING ANNUAL DUES");
    })
    .reduce((sum, a) => sum + a.amount, 0);

  if (annualDueReversed > 0) {
    const { data: stu } = await supabase
      .from("students")
      .select("previous_annual_due, annual_dues_original")
      .eq("id", studentId)
      .single();

    const currentAnnualDue = Number((stu as Record<string, unknown>)?.previous_annual_due ?? 0);
    const originalAnnualDue = Number((stu as Record<string, unknown>)?.annual_dues_original ?? 0);
    // Don't exceed the original amount when reversing
    const newAnnualDue = Math.min(originalAnnualDue, currentAnnualDue + annualDueReversed);
    await supabase
      .from("students")
      .update({ previous_annual_due: newAnnualDue })
      .eq("id", studentId);
  }

  // 6. Delete the payment record
  const { error: deleteError } = await supabase
    .from("fee_payments")
    .delete()
    .eq("id", paymentId)
    .eq("school_id", schoolId);

  if (deleteError) throw new Error(`Failed to delete payment: ${deleteError.message}`);
}

// ── Pay Annual Due (updates student balance + latest invoice) ─────────────────

export async function payAnnualDue(
  schoolId: string,
  studentId: string,
  amount: number
): Promise<{ student_id: string; previous_annual_due: number }> {
  const supabase: SupabaseClient = createSupabaseService();

  if (amount <= 0) throw new Error("Amount must be greater than 0");

  // Fetch student
  const { data: stuData, error: stuError } = await supabase
    .from("students")
    .select("previous_annual_due, school_id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (stuError) throw new Error(`Failed to fetch student: ${stuError.message}`);
  if (!stuData) throw new NotFoundError("Student not found");

  const currentAnnualDue = Number((stuData as Record<string, unknown>).previous_annual_due ?? 0);
  const newAnnualDue = Math.max(0, currentAnnualDue - amount);

  // 1. Update student's previous_annual_due
  const { error: updateError } = await supabase
    .from("students")
    .update({ previous_annual_due: newAnnualDue })
    .eq("id", studentId)
    .eq("school_id", schoolId);

  if (updateError) throw new Error(`Failed to update annual due: ${updateError.message}`);

  // 2. Find the student's most recent invoice that has an annual due particular
  const { data: invoices } = await supabase
    .from("fee_invoices")
    .select("*")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestInvoice = (invoices ?? [])[0] as Record<string, unknown> | undefined;

  if (latestInvoice) {
    const invoiceId = latestInvoice.id as string;

    // Update invoice: update the annual due particular's paid_amount in JSONB
    const particularsRaw = latestInvoice.particulars;
    const particulars = typeof particularsRaw === "string" ? JSON.parse(particularsRaw) : (particularsRaw ?? []);
    const parts = particulars as InvoiceParticular[];
    const annualPart = parts.find(
      (p) => p.label.toUpperCase().includes("ANNUAL DUE") || p.label.toUpperCase().includes("PENDING ANNUAL DUES")
    );
    if (annualPart) {
      annualPart.paid_amount = Math.min(annualPart.amount, annualPart.paid_amount + amount);
      annualPart.status = annualPart.paid_amount >= annualPart.amount ? "paid" : "partial";
    }
    const totalPaid = parts.reduce((sum, p) => sum + p.paid_amount, 0);
    const allSettled = parts.every((p) => p.status === "paid" || p.status === "waived");
    const newStatus = allSettled ? "paid" : "partial";

    await supabase
      .from("fee_invoices")
      .update({
        particulars: JSON.stringify(parts),
        paid_amount: totalPaid,
        status: newStatus,
        payment_date: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("school_id", schoolId);

    // Record payment entry with particular breakdown
    const breakdown = annualPart ? [{ label: annualPart.label, amount }] : [];
    await supabase
      .from("fee_payments")
      .insert({
        school_id: schoolId,
        invoice_id: invoiceId,
        student_id: studentId,
        amount: amount,
        payment_date: new Date().toISOString(),
        note: "Annual due payment",
        particular_breakdown: JSON.stringify(breakdown),
      });
  }

  return { student_id: studentId, previous_annual_due: newAnnualDue };
}
