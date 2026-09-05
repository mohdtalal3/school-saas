import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Fee Report ──────────────────────────────────────────────────────────────────

export interface FeeReportSummary {
  totalEstimated: number;
  totalCollected: number;
  totalRemaining: number;
  collectionRate: number;
  totalStudents: number;
}

export interface FeeReportClassBreakdown {
  classId: string;
  className: string;
  students: number;
  estimated: number;
  collected: number;
  remaining: number;
  collectionRate: number;
}

export interface FeeReportData {
  summary: FeeReportSummary;
  classBreakdown: FeeReportClassBreakdown[];
}

export async function getFeeReport(
  schoolId: string,
  feeMonth: string
): Promise<FeeReportData> {
  const supabase: SupabaseClient = createSupabaseService();

  // Fetch all invoices for the given month — use total_amount as estimated
  const { data: invoices, error: invError } = await supabase
    .from("fee_invoices")
    .select("id, class_id, class_name, total_amount, paid_amount, status, student_id")
    .eq("school_id", schoolId)
    .eq("fee_month", feeMonth);

  if (invError) throw new Error(`Failed to fetch invoices: ${invError.message}`);

  const invoiceRows = (invoices ?? []) as Record<string, unknown>[];

  // Build per-class breakdown from invoices
  const classMap = new Map<string, {
    classId: string;
    className: string;
    studentIds: Set<string>;
    estimated: number;
    collected: number;
    remaining: number;
  }>();

  for (const inv of invoiceRows) {
    const classId = inv.class_id as string | null;
    if (!classId) continue;

    const className = inv.class_name as string ?? "Unknown";
    const studentId = inv.student_id as string;
    const totalAmount = Number(inv.total_amount ?? 0);
    const paidAmount = Number(inv.paid_amount ?? 0);

    if (!classMap.has(classId)) {
      classMap.set(classId, {
        classId,
        className,
        studentIds: new Set(),
        estimated: 0,
        collected: 0,
        remaining: 0,
      });
    }

    const entry = classMap.get(classId)!;
    entry.studentIds.add(studentId);
    entry.estimated += totalAmount;
    entry.collected += paidAmount;
    entry.remaining += Math.max(0, totalAmount - paidAmount);
  }

  // Build breakdown array
  const classBreakdown: FeeReportClassBreakdown[] = Array.from(classMap.values())
    .map((entry) => ({
      classId: entry.classId,
      className: entry.className,
      students: entry.studentIds.size,
      estimated: Math.round(entry.estimated),
      collected: Math.round(entry.collected),
      remaining: Math.round(entry.remaining),
      collectionRate: entry.estimated > 0
        ? Math.round((entry.collected / entry.estimated) * 100)
        : 0,
    }))
    .sort((a, b) => b.estimated - a.estimated);

  // Build summary
  const totalEstimated = classBreakdown.reduce((sum, c) => sum + c.estimated, 0);
  const totalCollected = classBreakdown.reduce((sum, c) => sum + c.collected, 0);
  const totalRemaining = classBreakdown.reduce((sum, c) => sum + c.remaining, 0);
  const totalStudents = classBreakdown.reduce((sum, c) => sum + c.students, 0);

  const summary: FeeReportSummary = {
    totalEstimated,
    totalCollected,
    totalRemaining,
    collectionRate: totalEstimated > 0 ? Math.round((totalCollected / totalEstimated) * 100) : 0,
    totalStudents,
  };

  return { summary, classBreakdown };
}

// ── Daily Collection Log ────────────────────────────────────────────────────────

export interface DailyCollectionEntry {
  id: string;
  payment_date: string;
  amount: number;
  note: string | null;
  invoice_no: string;
  student_name: string;
  registration_no: string | null;
  class_id: string | null;
  class_name: string | null;
  fee_month: string | null;
}

export interface DailyCollectionClassSubtotal {
  classId: string | null;
  className: string;
  count: number;
  collected: number;
}

export interface DailyCollectionData {
  summary: {
    totalCollected: number;
    paymentCount: number;
  };
  classSubtotals: DailyCollectionClassSubtotal[];
  data: DailyCollectionEntry[];
}

export async function getDailyCollection(
  schoolId: string,
  dateFrom: string,
  dateTo: string,
  classId?: string
): Promise<DailyCollectionData> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("fee_payments")
    .select(
      "id, amount, payment_date, note, invoice:fee_invoices(invoice_no, student_name, registration_no, class_id, class_name, fee_month)"
    )
    .eq("school_id", schoolId)
    .gte("payment_date", `${dateFrom}T00:00:00`)
    .lte("payment_date", `${dateTo}T23:59:59.999999`)
    .order("payment_date", { ascending: true });

  if (error) throw new Error(`Failed to fetch daily collection: ${error.message}`);

  const entries: DailyCollectionEntry[] = [];
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const invoice = row.invoice as Record<string, unknown> | null;
    if (!invoice) continue;
    const entry: DailyCollectionEntry = {
      id: row.id as string,
      payment_date: row.payment_date as string,
      amount: Number(row.amount ?? 0),
      note: (row.note as string) ?? null,
      invoice_no: (invoice.invoice_no as string) ?? "",
      student_name: (invoice.student_name as string) ?? "",
      registration_no: (invoice.registration_no as string) ?? null,
      class_id: (invoice.class_id as string) ?? null,
      class_name: (invoice.class_name as string) ?? null,
      fee_month: (invoice.fee_month as string) ?? null,
    };
    if (classId && entry.class_id !== classId) continue;
    entries.push(entry);
  }

  const subtotalMap = new Map<string, DailyCollectionClassSubtotal>();
  let totalCollected = 0;
  for (const entry of entries) {
    totalCollected += entry.amount;
    const key = entry.class_id ?? "none";
    if (!subtotalMap.has(key)) {
      subtotalMap.set(key, {
        classId: entry.class_id,
        className: entry.class_name ?? "No class",
        count: 0,
        collected: 0,
      });
    }
    const subtotal = subtotalMap.get(key)!;
    subtotal.count += 1;
    subtotal.collected += entry.amount;
  }

  return {
    summary: {
      totalCollected: Math.round(totalCollected),
      paymentCount: entries.length,
    },
    classSubtotals: Array.from(subtotalMap.values()).sort(
      (a, b) => b.collected - a.collected
    ),
    data: entries,
  };
}
