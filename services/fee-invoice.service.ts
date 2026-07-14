import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FeeInvoice,
  FeeParticular,
  InvoiceParticular,
  GenerateInvoicePayload,
  Student,
  SchoolClass,
} from "@/types/school.types";
import { NotFoundError } from "@/lib/api-response";

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateInvoiceNo(count: number): string {
  return `INV-${String(count + 1).padStart(5, "0")}`;
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
  return particulars.map((p) => {
    let amount = p.amount;

    if (p.is_fixed && p.source_type) {
      switch (p.source_type) {
        case "class.fee":
          amount = cls?.fee ?? 0;
          break;
        case "class.annual_dues":
          amount = cls?.annual_dues ?? 0;
          break;
        case "student.previous_balance":
          amount = student.previous_balance ?? 0;
          break;
        case "student.discount":
          amount = student.discount ?? 0;
          break;
        case "student.annual_dues_discount":
          amount = student.annual_dues_discount ?? 0;
          break;
        default:
          amount = 0;
      }
    }

    return {
      label: p.label,
      amount,
      is_fixed: p.is_fixed,
      source_type: p.source_type,
    };
  });
}

function calculateTotal(particulars: InvoiceParticular[]): number {
  return particulars.reduce((sum, p) => {
    // Discounts and previous balance adjustments are additive in the invoice
    // The label determines if it's a discount (negative) or a charge (positive)
    // For now, all amounts are treated as charges except those with "DISCOUNT" in label
    const isDiscount = p.label.toUpperCase().includes("DISCOUNT");
    return sum + (isDiscount ? -Math.abs(p.amount) : p.amount);
  }, 0);
}

// ── Get next invoice number ────────────────────────────────────────────────────

async function getNextInvoiceNo(
  supabase: SupabaseClient,
  schoolId: string
): Promise<string> {
  const { count, error } = await supabase
    .from("fee_invoices")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);

  if (error) throw new Error(`Failed to count invoices: ${error.message}`);
  return generateInvoiceNo(count ?? 0);
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

  // 3. Resolve fine from fee particulars (label contains "FINE")
  const fineParticular = particulars.find(
    (p) => p.label.toUpperCase().includes("FINE") && !p.is_fixed
  );
  const resolvedFine = fineParticular?.amount ?? 0;

  // 4. Get starting invoice number
  let invoiceCounter = await getNextInvoiceNo(supabase, schoolId);
  const invoiceCount = invoiceCounter.replace("INV-", "");
  let counterNum = parseInt(invoiceCount, 10);

  // 4. Build invoice rows
  const invoiceRows: Record<string, unknown>[] = [];

  for (const { student, class: cls } of studentsWithClass) {
    const resolvedParticulars = resolveParticulars(particulars, student, cls);
    const total = calculateTotal(resolvedParticulars);

    invoiceRows.push({
      school_id: schoolId,
      invoice_no: generateInvoiceNo(counterNum),
      student_id: student.id,
      student_name: student.name,
      class_id: cls?.id ?? null,
      class_name: cls?.name ?? null,
      registration_no: student.registration_no,
      fee_month: payload.fee_month,
      due_date: payload.due_date,
      fine_after_due: resolvedFine,
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
