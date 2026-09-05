import { createSupabaseService } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Fee income auto-sync ───────────────────────────────────────────────────────
// Each day's fee collections are aggregated into ONE system-managed income
// transaction (transaction_number FEE-YYYYMMDD, source 'fee_collection') so the
// Accounts Statement reflects fee income without manual entry and without one
// row per payment. The per-payment detail lives in Fees → Daily Collection.

export const FEE_COLLECTION_CATEGORY = "Fee Collection";

/**
 * Finds or creates the school's protected "Fee Collection" income category.
 * Safe under concurrency: falls back to re-select on unique violation.
 */
async function ensureFeeCollectionCategory(
  supabase: SupabaseClient,
  schoolId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("account_categories")
    .select("id")
    .eq("school_id", schoolId)
    .eq("type", "income")
    .ilike("name", FEE_COLLECTION_CATEGORY)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: inserted, error } = await supabase
    .from("account_categories")
    .insert({
      school_id: schoolId,
      name: FEE_COLLECTION_CATEGORY,
      type: "income",
      description: "Auto-managed — daily fee collections from the Fees module.",
    })
    .select("id")
    .single();

  if (!error && inserted) return (inserted as { id: string }).id;

  // Lost a race with the unique name index — re-select
  const { data: fallback } = await supabase
    .from("account_categories")
    .select("id")
    .eq("school_id", schoolId)
    .eq("type", "income")
    .ilike("name", FEE_COLLECTION_CATEGORY)
    .maybeSingle();
  if (fallback) return (fallback as { id: string }).id;
  throw new Error("Failed to ensure Fee Collection category");
}

/**
 * Recomputes the day's total from fee_payments and upserts the single
 * FEE-YYYYMMDD income transaction. Called after every fee payment
 * create/delete so the Statement row always matches actual payments.
 */
export async function syncFeeIncomeForDate(
  schoolId: string,
  date: string // yyyy-mm-dd
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  try {
    // 1. Day total from actual payments
    const { data: payments, error: sumError } = await supabase
      .from("fee_payments")
      .select("amount")
      .eq("school_id", schoolId)
      .gte("payment_date", `${date}T00:00:00`)
      .lte("payment_date", `${date}T23:59:59.999999`);
    if (sumError) throw new Error(sumError.message);

    const dayTotal = (payments ?? []).reduce(
      (sum, p) => sum + Number((p as { amount: number }).amount ?? 0),
      0
    );

    const transactionNumber = `FEE-${date.replace(/-/g, "")}`;

    // 2. No payments that day → void the auto row if it exists and is active
    if (dayTotal <= 0) {
      const { data: existing } = await supabase
        .from("financial_transactions")
        .select("id, status, amount")
        .eq("school_id", schoolId)
        .eq("transaction_number", transactionNumber)
        .maybeSingle();
      const row = existing as { id: string; status: string; amount: number } | null;
      if (row && row.status === "active") {
        const { error: voidError } = await supabase
          .from("financial_transactions")
          .update({ status: "void", updated_by: null })
          .eq("id", row.id);
        if (voidError) throw new Error(voidError.message);
        await supabase.from("financial_audit_log").insert({
          school_id: schoolId,
          transaction_id: row.id,
          action: "voided",
          previous_value: "active",
          new_value: "void",
          changed_by: null,
          changed_by_name: "System (fee sync)",
        });
      }
      return;
    }

    // 3. Upsert the single daily fee income row
    const categoryId = await ensureFeeCollectionCategory(supabase, schoolId);

    const { data: upserted, error: upsertError } = await supabase
      .from("financial_transactions")
      .upsert(
        {
          school_id: schoolId,
          transaction_number: transactionNumber,
          type: "income",
          category_id: categoryId,
          transaction_date: date,
          amount: dayTotal,
          payment_method: "Cash",
          reference_number: null,
          party_name: null,
          description: `Fee collection — daily total for ${date} (see Fees → Daily Collection for detail)`,
          status: "active",
          source: "fee_collection",
          created_by: null,
          created_by_name: "System (fee sync)",
        },
        { onConflict: "school_id,transaction_number" }
      )
      .select("id, amount, status")
      .single();
    if (upsertError) throw new Error(upsertError.message);

    const tx = upserted as { id: string; amount: number; status: string };

    // 4. Audit trail — created vs amount-updated
    const { data: preExisting } = await supabase
      .from("financial_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("transaction_id", tx.id);
    const isNew = (preExisting?.length ?? 0) === 0;

    if (isNew) {
      await supabase.from("financial_audit_log").insert({
        school_id: schoolId,
        transaction_id: tx.id,
        action: "created",
        new_value: `${transactionNumber} (income) amount ${dayTotal}`,
        changed_by: null,
        changed_by_name: "System (fee sync)",
      });
    } else {
      await supabase.from("financial_audit_log").insert({
        school_id: schoolId,
        transaction_id: tx.id,
        action: "updated",
        field_name: "Amount",
        previous_value: String(tx.amount),
        new_value: String(dayTotal),
        changed_by: null,
        changed_by_name: "System (fee sync)",
      });
    }
  } catch (e) {
    // Never fail the fee payment itself because of statement sync —
    // the next payment on the same date re-syncs and self-heals.
    console.error(`[fee-income-sync] Failed to sync ${schoolId} ${date}:`, e);
  }
}
