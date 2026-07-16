import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FeeInvoice,
  FeeParticular,
  InvoiceParticular,
  GenerateInvoicePayload,
  CustomParticular,
  CollectFeePayload,
  FeePayment,
  Student,
  SchoolClass,
} from "@/types/school.types";
import { NotFoundError } from "@/lib/api-response";

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateInvoiceNo(feeMonth: string, count: number): string {
  // feeMonth format: YYYY-MM
  const [year, month] = feeMonth.split("-");
  return `INV-${month}_${year}_${String(count + 1).padStart(4, "0")}`;
}

function buildInvoice(data: Record<string, unknown>): FeeInvoice {
  return data as unknown as FeeInvoice;
}

// ── Resolve particulars for a student ──────────────────────────────────────────
// Fixed particulars: resolve amount from class/student data based on source_type
// Custom particulars: use the stored amount

function resolveParticulars(
  particulars: FeeParticular[],
  student: Student,
  cls: SchoolClass | null
): InvoiceParticular[] {
  // Separate discount particulars from charge particulars
  const chargeParts = particulars.filter(
    (p) => !p.label.toUpperCase().includes("FINE") &&
           !p.label.toUpperCase().includes("DISCOUNT")
  );
  const discountParts = particulars.filter(
    (p) => p.label.toUpperCase().includes("DISCOUNT")
  );

  // Resolve charge amounts
  const resolved = chargeParts
    .filter((p) => {
      // Skip annual dues particular if the remaining balance is 0 (fully paid for the year)
      if (p.is_fixed && p.source_type === "student.previous_annual_due") {
        return (student.previous_annual_due ?? 0) > 0;
      }
      return true;
    })
    .map((p) => {
      let amount = p.amount;

      if (p.is_fixed && p.source_type) {
        switch (p.source_type) {
          case "class.fee":
            amount = cls?.fee ?? 0;
            break;
          case "student.previous_annual_due":
            amount = student.previous_annual_due ?? 0;
            break;
          case "student.previous_balance":
            amount = student.previous_balance ?? 0;
            break;
          default:
            amount = 0;
        }
      }

      return {
        label: p.label,
        amount,
        paid_amount: 0,
        status: "unpaid" as const,
        is_fixed: p.is_fixed,
        source_type: p.source_type,
      };
    });

  // Apply discounts directly to charge amounts
  // Note: "ANNUAL DUES DISCOUNT" is already baked into student.previous_annual_due
  // (calculated as class.annual_dues - annual_dues_discount at creation/promotion),
  // so we skip it here to avoid double-discounting.
  for (const dp of discountParts) {
    if (dp.label.toUpperCase().includes("ANNUAL DUES")) continue;

    let discountAmount = dp.amount;
    if (dp.is_fixed && dp.source_type) {
      switch (dp.source_type) {
        case "student.discount":
          discountAmount = student.discount ?? 0;
          break;
        default:
          discountAmount = 0;
      }
    }
    if (discountAmount <= 0) continue;

    // Apply "DISCOUNT IN FEE" to the class.fee particular (tuition)
    if (dp.label.toUpperCase().includes("FEE")) {
      const tuition = resolved.find(
        (r) => r.source_type === "class.fee"
      );
      if (tuition) {
        tuition.amount = Math.max(0, tuition.amount - discountAmount);
      }
    }
    // Generic discount: apply to the first charge particular
    else {
      const firstCharge = resolved.find(
        (r) => r.amount > 0 && r.source_type !== "student.previous_balance"
      );
      if (firstCharge) {
        firstCharge.amount = Math.max(0, firstCharge.amount - discountAmount);
      }
    }
  }

  // Filter out zero-amount charges (except previous_balance which may carry 0)
  return resolved.filter(
    (r) => r.amount > 0 || r.source_type === "student.previous_balance"
  );
}

function calculateTotal(particulars: InvoiceParticular[]): number {
  return particulars.reduce((sum, p) => sum + p.amount, 0);
}

// ── Get next invoice number ────────────────────────────────────────────────────

async function getNextInvoiceNo(
  supabase: SupabaseClient,
  schoolId: string,
  feeMonth: string
): Promise<string> {
  const [year, month] = feeMonth.split("-");
  const prefix = `INV-${month}_${year}_`;
  const { count, error } = await supabase
    .from("fee_invoices")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .like("invoice_no", `${prefix}%`);

  if (error) throw new Error(`Failed to count invoices: ${error.message}`);
  return generateInvoiceNo(feeMonth, count ?? 0);
}

// ── Fetch students for invoice generation ──────────────────────────────────────

async function fetchStudentsForClass(
  supabase: SupabaseClient,
  schoolId: string,
  classId: string
): Promise<{ student: Student; class: SchoolClass | null }[]> {
  // Get class info
  const { data: classData } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .maybeSingle();

  const cls = classData as unknown as SchoolClass | null;

  // Get all active students in this class
  const { data: students, error } = await supabase
    .from("students")
    .select("*")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to fetch students: ${error.message}`);

  return (students ?? []).map((s) => ({
    student: s as unknown as Student,
    class: cls,
  }));
}

async function fetchStudentsByIds(
  supabase: SupabaseClient,
  schoolId: string,
  studentIds: string[]
): Promise<{ student: Student; class: SchoolClass | null }[]> {
  const { data: students, error } = await supabase
    .from("students")
    .select("*")
    .eq("school_id", schoolId)
    .in("id", studentIds)
    .eq("is_active", true);

  if (error) throw new Error(`Failed to fetch students: ${error.message}`);

  // Fetch classes for these students
  const classIds = [...new Set(
    (students ?? [])
      .map((s) => (s as Record<string, unknown>).class_id as string | null)
      .filter(Boolean)
  )] as string[];

  let classMap: Record<string, SchoolClass> = {};
  if (classIds.length > 0) {
    const { data: classes } = await supabase
      .from("classes")
      .select("*")
      .in("id", classIds);
    (classes ?? []).forEach((c) => {
      const cls = c as unknown as SchoolClass;
      classMap[cls.id] = cls;
    });
  }

  return (students ?? []).map((s) => {
    const student = s as unknown as Student;
    return {
      student,
      class: student.class_id ? classMap[student.class_id] ?? null : null,
    };
  });
}

async function fetchAllClassesWithStudents(
  supabase: SupabaseClient,
  schoolId: string
): Promise<{ student: Student; class: SchoolClass | null }[]> {
  // Get all active classes
  const { data: classes, error: clsError } = await supabase
    .from("classes")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (clsError) throw new Error(`Failed to fetch classes: ${clsError.message}`);

  const classList = (classes ?? []) as unknown as SchoolClass[];
  const results: { student: Student; class: SchoolClass | null }[] = [];

  for (const cls of classList) {
    const { data: students, error } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId)
      .eq("class_id", cls.id)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw new Error(`Failed to fetch students: ${error.message}`);

    for (const s of students ?? []) {
      results.push({
        student: s as unknown as Student,
        class: cls,
      });
    }
  }

  return results;
}

// ── Generate invoices ──────────────────────────────────────────────────────────

export async function generateInvoices(
  schoolId: string,
  payload: GenerateInvoicePayload
): Promise<FeeInvoice[]> {
  const supabase: SupabaseClient = createSupabaseService();

  // 1. Fetch fee particulars
  const { data: pData, error: pError } = await supabase
    .from("fee_particulars")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (pError) throw new Error(`Failed to fetch fee particulars: ${pError.message}`);
  const particulars = (pData ?? []) as unknown as FeeParticular[];

  if (particulars.length === 0) {
    throw new Error("No fee particulars configured. Please configure fee particulars first.");
  }

  // 2. Fetch students based on mode
  let studentsWithClass: { student: Student; class: SchoolClass | null }[] = [];

  if (payload.mode === "class" && payload.class_id) {
    studentsWithClass = await fetchStudentsForClass(supabase, schoolId, payload.class_id);
  } else if (payload.mode === "student" && payload.student_ids?.length) {
    studentsWithClass = await fetchStudentsByIds(supabase, schoolId, payload.student_ids);
  } else if (payload.mode === "all-classes") {
    studentsWithClass = await fetchAllClassesWithStudents(supabase, schoolId);
  } else {
    throw new Error("Invalid generation mode or missing parameters.");
  }

  if (studentsWithClass.length === 0) {
    throw new Error("No active students found for the selected criteria.");
  }

  // 2b. Skip students who already have an invoice for this month
  const studentIds = studentsWithClass.map((s) => s.student.id);
  const { data: existing } = await supabase
    .from("fee_invoices")
    .select("student_id")
    .eq("school_id", schoolId)
    .eq("fee_month", payload.fee_month)
    .in("student_id", studentIds);

  const existingStudentIds = new Set(
    (existing ?? []).map((r) => (r as Record<string, unknown>).student_id as string)
  );

  studentsWithClass = studentsWithClass.filter(
    (s) => !existingStudentIds.has(s.student.id)
  );

  if (studentsWithClass.length === 0) {
    return [];
  }

  // 3. Resolve fine from fee particulars (label contains "FINE")
  const fineParticular = particulars.find(
    (p) => p.label.toUpperCase().includes("FINE") && !p.is_fixed
  );
  const resolvedFine = fineParticular?.amount ?? 0;

  // 4. Get starting invoice number (per month-year prefix)
  const startInvoiceNo = await getNextInvoiceNo(supabase, schoolId, payload.fee_month);
  const parts = startInvoiceNo.split("_");
  let counterNum = parseInt(parts[parts.length - 1], 10);

  // 4b. If custom_particulars provided, use them directly (student-wise mode with edit)
  const useCustomParticulars = payload.custom_particulars && payload.custom_particulars.length > 0;

  // 4c. Collect balance additions for add_to_balance items
  const balanceAdditions: { studentId: string; amount: number }[] = [];

  // 5. Build invoice rows
  const invoiceRows: Record<string, unknown>[] = [];

  for (const { student, class: cls } of studentsWithClass) {
    let resolvedParticulars: InvoiceParticular[];

    if (useCustomParticulars) {
      // Use custom particulars provided from the edit dialog
      // Separate FINE into fine_after_due (same behavior as default mode)
      // Discounts are applied directly to charge amounts, not shown separately
      const customParts = payload.custom_particulars as CustomParticular[];
      const customCharges = customParts.filter(
        (p) => !p.label.toUpperCase().includes("FINE") && !p.label.toUpperCase().includes("DISCOUNT")
      );
      const customDiscounts = customParts.filter(
        (p) => p.label.toUpperCase().includes("DISCOUNT")
      );

      resolvedParticulars = customCharges
        .filter((p) => p.amount !== 0)
        .map((p) => ({
          label: p.label,
          amount: p.amount,
          paid_amount: 0,
          status: "unpaid" as const,
          is_fixed: p.is_fixed,
          source_type: p.source_type,
        }));

      // Apply custom discounts to charge amounts
      // Skip ANNUAL DUES DISCOUNT — already baked into previous_annual_due
      for (const dp of customDiscounts) {
        if (dp.amount <= 0) continue;
        if (dp.label.toUpperCase().includes("ANNUAL DUES")) continue;
        if (dp.label.toUpperCase().includes("FEE")) {
          const tuition = resolvedParticulars.find((r) => r.source_type === "class.fee");
          if (tuition) tuition.amount = Math.max(0, tuition.amount - dp.amount);
        } else if (dp.label.toUpperCase().includes("ANNUAL DUES")) {
          const annualDue = resolvedParticulars.find((r) => r.source_type === "student.previous_annual_due");
          if (annualDue) annualDue.amount = Math.max(0, annualDue.amount - dp.amount);
        } else {
          const firstCharge = resolvedParticulars.find((r) => r.amount > 0 && r.source_type !== "student.previous_balance");
          if (firstCharge) firstCharge.amount = Math.max(0, firstCharge.amount - dp.amount);
        }
      }

      // Filter out zero-amount charges after discount application
      resolvedParticulars = resolvedParticulars.filter(
        (r) => r.amount > 0 || r.source_type === "student.previous_balance"
      );

      // Collect add_to_balance amounts (exclude discounts and fine)
      const balanceAdd = customParts
        .filter((p) => p.add_to_balance && p.amount > 0 && !p.label.toUpperCase().includes("DISCOUNT") && !p.label.toUpperCase().includes("FINE"))
        .reduce((sum, p) => sum + p.amount, 0);
      if (balanceAdd > 0) {
        balanceAdditions.push({ studentId: student.id, amount: balanceAdd });
      }
    } else {
      resolvedParticulars = resolveParticulars(particulars, student, cls);
    }

    const total = calculateTotal(resolvedParticulars);

    invoiceRows.push({
      school_id: schoolId,
      invoice_no: generateInvoiceNo(payload.fee_month, counterNum),
      student_id: student.id,
      student_name: student.name,
      class_id: cls?.id ?? null,
      class_name: cls?.name ?? null,
      registration_no: student.registration_no,
      fee_month: payload.fee_month,
      due_date: payload.due_date,
      fine_after_due: useCustomParticulars
        ? ((payload.custom_particulars as CustomParticular[])?.find((p) => p.label.toUpperCase().includes("FINE"))?.amount ?? resolvedFine)
        : resolvedFine,
      particulars: JSON.stringify(resolvedParticulars),
      total_amount: total,
      status: "unpaid",
      father_name: student.father_name,
      father_nic: student.father_nic,
      mobile: student.mobile,
    });

    counterNum++;
  }

  // 5. Insert all invoices
  const { data: inserted, error: insertError } = await supabase
    .from("fee_invoices")
    .insert(invoiceRows as never)
    .select("*");

  if (insertError) throw new Error(`Failed to create invoices: ${insertError.message}`);

  // 6. Add add_to_balance items (e.g. admission fee) to previous_balance
  for (const { studentId, amount } of balanceAdditions) {
    const { data: stu } = await supabase
      .from("students")
      .select("previous_balance")
      .eq("id", studentId)
      .single();
    const currentBalance = (stu as Record<string, unknown>)?.previous_balance as number ?? 0;
    await supabase
      .from("students")
      .update({ previous_balance: currentBalance + amount })
      .eq("id", studentId);
  }

  return (inserted ?? []) as unknown as FeeInvoice[];
}

// ── List invoices ──────────────────────────────────────────────────────────────

export async function getInvoices(
  schoolId: string,
  params: { page?: number; limit?: number; search?: string; classId?: string; feeMonth?: string; status?: string } = {}
): Promise<{ data: FeeInvoice[]; total: number }> {
  const supabase: SupabaseClient = createSupabaseService();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 25);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("fee_invoices")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId);

  if (params.search?.trim()) {
    query = query.or(
      `invoice_no.ilike.%${params.search}%,student_name.ilike.%${params.search}%,registration_no.ilike.%${params.search}%,father_nic.ilike.%${params.search}%,mobile.ilike.%${params.search}%`
    );
  }
  if (params.classId) query = query.eq("class_id", params.classId);
  if (params.feeMonth) query = query.eq("fee_month", params.feeMonth);
  if (params.status && params.status !== "all") query = query.eq("status", params.status);

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);

  return {
    data: (data ?? []) as unknown as FeeInvoice[],
    total: count ?? 0,
  };
}

// ── Get invoices by IDs (for PDF) ──────────────────────────────────────────────

export async function getInvoicesByIds(
  schoolId: string,
  invoiceIds: string[]
): Promise<FeeInvoice[]> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("fee_invoices")
    .select("*")
    .eq("school_id", schoolId)
    .in("id", invoiceIds);

  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
  return (data ?? []) as unknown as FeeInvoice[];
}

// ── Get invoices by class + month ──────────────────────────────────────────────

export async function getInvoicesByClassAndMonth(
  schoolId: string,
  classId: string,
  feeMonth: string
): Promise<FeeInvoice[]> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("fee_invoices")
    .select("*")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("fee_month", feeMonth);

  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
  return (data ?? []) as unknown as FeeInvoice[];
}

// ── Get all invoices for a month (all classes) ─────────────────────────────────

export async function getInvoicesByMonth(
  schoolId: string,
  feeMonth: string
): Promise<FeeInvoice[]> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("fee_invoices")
    .select("*")
    .eq("school_id", schoolId)
    .eq("fee_month", feeMonth)
    .order("class_name", { ascending: true })
    .order("student_name", { ascending: true });

  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
  return (data ?? []) as unknown as FeeInvoice[];
}

// ── Delete invoice ─────────────────────────────────────────────────────────────

export async function deleteInvoice(
  invoiceId: string,
  schoolId: string
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  const { error } = await supabase
    .from("fee_invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("school_id", schoolId);

  if (error) throw new Error(`Failed to delete invoice: ${error.message}`);
}

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
  const allSettled = parts.every((p) => p.status === "paid" || p.status === "waived");
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
  const allSettled = parts.every((p) => p.status === "paid" || p.status === "waived");
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
