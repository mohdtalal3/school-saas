import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FeeParticular,
  NewFeeParticular,
  UpdateFeeParticular,
} from "@/types/school.types";
import { NotFoundError } from "@/lib/api-response";

function buildParticular(data: Record<string, unknown>): FeeParticular {
  return data as unknown as FeeParticular;
}

// ── Default seed particulars ───────────────────────────────────────────────────
// is_fixed = true  → amount auto-resolved from class/student data at fee calc time
// is_fixed = false → user sets a fixed amount
// source_type identifies which entity field the amount comes from

interface DefaultParticular {
  label: string;
  amount: number;
  is_fixed: boolean;
  source_type: string | null;
  sort_order: number;
}

const DEFAULT_PARTICULARS: DefaultParticular[] = [
  { label: "MONTHLY TUITION FEE", amount: 0, is_fixed: true, source_type: "class.fee", sort_order: 1 },
  { label: "ADMISSION FEE", amount: 0, is_fixed: false, source_type: null, sort_order: 2 },
  { label: "REGISTRATION FEE", amount: 0, is_fixed: false, source_type: null, sort_order: 3 },
  { label: "FINE", amount: 0, is_fixed: false, source_type: null, sort_order: 4 },
  { label: "PREVIOUS BALANCE", amount: 0, is_fixed: true, source_type: "student.previous_balance", sort_order: 5 },
  { label: "DISCOUNT IN FEE", amount: 0, is_fixed: true, source_type: "student.discount", sort_order: 6 },
  { label: "ANNUAL DUES DISCOUNT", amount: 0, is_fixed: true, source_type: "student.annual_dues_discount", sort_order: 7 },
  { label: "PENDING ANNUAL DUES", amount: 0, is_fixed: true, source_type: "student.previous_annual_due", sort_order: 8 },
];

// ── Seed defaults if none exist ────────────────────────────────────────────────

async function seedDefaults(supabase: SupabaseClient, schoolId: string): Promise<void> {
  const rows = DEFAULT_PARTICULARS.map((p) => ({
    school_id: schoolId,
    label: p.label,
    amount: p.amount,
    is_fixed: p.is_fixed,
    source_type: p.source_type,
    sort_order: p.sort_order,
    is_active: true,
  }));

  const { error } = await supabase
    .from("fee_particulars")
    .insert(rows as never);

  if (error) throw new Error(`Failed to seed fee particulars: ${error.message}`);
}

// ── Read all ────────────────────────────────────────────────────────────────────

export async function getFeeParticulars(
  schoolId: string
): Promise<FeeParticular[]> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("fee_particulars")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Failed to fetch fee particulars: ${error.message}`);

  // Seed defaults if table is empty for this school
  if (!data || data.length === 0) {
    await seedDefaults(supabase, schoolId);
    const { data: seeded, error: err2 } = await supabase
      .from("fee_particulars")
      .select("*")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (err2) throw new Error(`Failed to fetch seeded fee particulars: ${err2.message}`);
    return (seeded ?? []) as unknown as FeeParticular[];
  }

  return (data ?? []) as unknown as FeeParticular[];
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createFeeParticular(
  schoolId: string,
  input: NewFeeParticular
): Promise<FeeParticular> {
  const supabase: SupabaseClient = createSupabaseService();

  // Get next sort_order
  const { data: existing } = await supabase
    .from("fee_particulars")
    .select("sort_order")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0
    ? (existing[0] as Record<string, unknown>).sort_order as number + 1
    : 1;

  const insertData: Record<string, unknown> = {
    school_id: schoolId,
    label: input.label,
    amount: input.amount ?? 0,
    is_fixed: input.is_fixed ?? false,
    source_type: input.source_type ?? null,
    sort_order: input.sort_order ?? nextOrder,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("fee_particulars")
    .insert(insertData as never)
    .select()
    .single();

  if (error) throw new Error(`Failed to create fee particular: ${error.message}`);
  return buildParticular(data as Record<string, unknown>);
}

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateFeeParticular(
  particularId: string,
  schoolId: string,
  payload: UpdateFeeParticular
): Promise<FeeParticular> {
  const supabase: SupabaseClient = createSupabaseService();

  const updates: Record<string, unknown> = { ...payload } as Record<string, unknown>;

  const { data, error } = await supabase
    .from("fee_particulars")
    .update(updates as never)
    .eq("id", particularId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update fee particular: ${error.message}`);
  if (!data) throw new NotFoundError("Fee particular not found");
  return buildParticular(data as Record<string, unknown>);
}

// ── Delete (soft) ───────────────────────────────────────────────────────────────

export async function deleteFeeParticular(
  particularId: string,
  schoolId: string
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  const { error } = await supabase
    .from("fee_particulars")
    .update({ is_active: false } as never)
    .eq("id", particularId)
    .eq("school_id", schoolId);

  if (error) throw new Error(`Failed to delete fee particular: ${error.message}`);
}
