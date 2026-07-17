import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FeeInvoice,
  FeeParticular,
  InvoiceParticular,
  GenerateInvoicePayload,
  CustomParticular,
  Student,
  SchoolClass,
} from "@/types/school.types";

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

