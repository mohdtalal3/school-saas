import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Fee Defaulters ─────────────────────────────────────────────────────────────

export interface FeeDefaulter {
  id: string;
  invoice_no: string;
  student_id: string;
  student_name: string;
  class_id: string | null;
  class_name: string | null;
  registration_no: string | null;
  fee_month: string;
  total_amount: number;
  paid_amount: number;
  remaining: number;
  status: "unpaid" | "partial";
  father_name: string | null;
  father_nic: string | null;
  mobile: string | null;
  is_active: boolean;
}

export async function getFeeDefaulters(
  schoolId: string,
  params: { page?: number; limit?: number; search?: string; classId?: string; feeMonth?: string; statusFilter?: "unpaid" | "partial" } = {}
): Promise<{ data: FeeDefaulter[]; total: number }> {
  const supabase: SupabaseClient = createSupabaseService();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 25);
  const offset = (page - 1) * limit;

  const statuses = params.statusFilter ? [params.statusFilter] : ["unpaid", "partial"];

  let query = supabase
    .from("fee_invoices")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId)
    .in("status", statuses);

  if (params.search?.trim()) {
    query = query.or(
      `invoice_no.ilike.%${params.search}%,student_name.ilike.%${params.search}%,registration_no.ilike.%${params.search}%,father_nic.ilike.%${params.search}%,mobile.ilike.%${params.search}%`
    );
  }
  if (params.classId) query = query.eq("class_id", params.classId);
  if (params.feeMonth) query = query.eq("fee_month", params.feeMonth);

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch defaulters: ${error.message}`);

  const defaulters: FeeDefaulter[] = (data ?? []).map((inv) => {
    const invoice = inv as Record<string, unknown>;
    const totalAmount = Number(invoice.total_amount ?? 0);
    const paidAmount = Number(invoice.paid_amount ?? 0);
    return {
      id: invoice.id as string,
      invoice_no: invoice.invoice_no as string,
      student_id: invoice.student_id as string,
      student_name: invoice.student_name as string,
      class_id: invoice.class_id as string | null,
      class_name: invoice.class_name as string | null,
      registration_no: invoice.registration_no as string | null,
      fee_month: invoice.fee_month as string,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining: Math.max(0, totalAmount - paidAmount),
      status: invoice.status as "unpaid" | "partial",
      father_name: invoice.father_name as string | null,
      father_nic: invoice.father_nic as string | null,
      mobile: invoice.mobile as string | null,
      is_active: true,
    };
  });

  return { data: defaulters, total: count ?? 0 };
}
