import { createSupabaseService } from "@/lib/supabase";
import { NotFoundError, AppError } from "@/lib/api-response";
import { PAYMENT_METHODS, TRANSACTION_SORT_FIELDS } from "@/lib/accounts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountCategory,
  NewAccountCategory,
  UpdateAccountCategory,
  FinancialTransaction,
  NewTransactionPayload,
  UpdateTransactionPayload,
  TransactionAttachment,
  FinancialAuditEntry,
  StatementSummary,
  QuickSummary,
} from "@/types/school.types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function txRow(row: Record<string, unknown>): FinancialTransaction {
  const category = row.category as { name?: string } | null;
  return {
    id: row.id as string,
    school_id: row.school_id as string,
    transaction_number: row.transaction_number as string,
    type: row.type as FinancialTransaction["type"],
    category_id: row.category_id as string,
    category_name: category?.name ?? null,
    transaction_date: row.transaction_date as string,
    amount: Number(row.amount ?? 0),
    payment_method: row.payment_method as string,
    reference_number: (row.reference_number as string) ?? null,
    party_name: (row.party_name as string) ?? null,
    description: (row.description as string) ?? null,
    status: row.status as FinancialTransaction["status"],
    source: (row.source as FinancialTransaction["source"]) ?? "manual",
    created_by: (row.created_by as string) ?? null,
    created_by_name: (row.created_by_name as string) ?? null,
    updated_by: (row.updated_by as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** yyyy-mm-dd arithmetic that is timezone-safe. */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function generateTransactionNumber(
  supabase: SupabaseClient,
  schoolId: string,
  type: "income" | "expense",
  year: number
): Promise<string> {
  const prefix = type === "income" ? "INC" : "EXP";
  const { count } = await supabase
    .from("financial_transactions")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .like("transaction_number", `${prefix}-${year}-%`);
  return `${prefix}-${year}-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

async function writeAudit(
  supabase: SupabaseClient,
  entry: Partial<FinancialAuditEntry> & { school_id: string; action: string }
): Promise<void> {
  const { error } = await supabase.from("financial_audit_log").insert(entry);
  if (error) throw new Error(`Failed to write audit log: ${error.message}`);
}

async function writeAuditMany(
  supabase: SupabaseClient,
  entries: Array<Partial<FinancialAuditEntry> & { school_id: string; action: string }>
): Promise<void> {
  if (!entries.length) return;
  const { error } = await supabase.from("financial_audit_log").insert(entries);
  if (error) throw new Error(`Failed to write audit log: ${error.message}`);
}

/** Resolves the display name of an admin for audit/created_by snapshots. */
export async function getAdminName(
  adminId: string | null
): Promise<{ id: string | null; name: string | null }> {
  if (!adminId) return { id: null, name: null };
  const supabase: SupabaseClient = createSupabaseService();
  const { data } = await supabase
    .from("school_admins")
    .select("id, name")
    .eq("id", adminId)
    .maybeSingle();
  if (!data) return { id: adminId, name: null };
  return { id: (data as { id: string }).id, name: (data as { name: string }).name };
}

// ── Chart of Accounts (categories) ────────────────────────────────────────────

export interface CategoryListParams {
  type?: "income" | "expense";
  search?: string;
  status?: "active" | "inactive" | "all";
  sortBy?: "name" | "created_at" | "updated_at";
  sortDir?: "asc" | "desc";
}

export async function getAccountCategories(
  schoolId: string,
  params: CategoryListParams = {}
): Promise<{ data: AccountCategory[]; counts: { active: number; inactive: number } }> {
  const supabase: SupabaseClient = createSupabaseService();

  let query = supabase
    .from("account_categories")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId);

  if (params.type) query = query.eq("type", params.type);
  if (params.status && params.status !== "all") {
    query = query.eq("is_active", params.status === "active");
  }
  if (params.search?.trim()) {
    query = query.or(
      `name.ilike.%${params.search.trim()}%,description.ilike.%${params.search.trim()}%`
    );
  }

  const sortBy = params.sortBy ?? "name";
  const sortDir = params.sortDir ?? "asc";
  query = query.order(sortBy, { ascending: sortDir === "asc" });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch categories: ${error.message}`);

  const { count: active } = await supabase
    .from("account_categories")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("is_active", true);
  const { count: inactive } = await supabase
    .from("account_categories")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("is_active", false);

  return {
    data: (data ?? []) as unknown as AccountCategory[],
    counts: { active: active ?? 0, inactive: inactive ?? 0 },
  };
}

export async function createAccountCategory(
  schoolId: string,
  payload: NewAccountCategory
): Promise<AccountCategory> {
  const supabase: SupabaseClient = createSupabaseService();

  const name = payload.name.trim();
  if (!name) throw new AppError("Category name is required");

  const { data: existing } = await supabase
    .from("account_categories")
    .select("id")
    .eq("school_id", schoolId)
    .eq("type", payload.type)
    .ilike("name", name)
    .maybeSingle();
  if (existing) {
    throw new AppError(
      `A ${payload.type} category with this name already exists`,
      "DUPLICATE_CATEGORY",
      409
    );
  }

  const { data, error } = await supabase
    .from("account_categories")
    .insert({
      school_id: schoolId,
      name,
      type: payload.type,
      description: payload.description?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create category: ${error.message}`);
  return data as unknown as AccountCategory;
}

export async function updateAccountCategory(
  schoolId: string,
  categoryId: string,
  payload: UpdateAccountCategory
): Promise<AccountCategory> {
  const supabase: SupabaseClient = createSupabaseService();

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) throw new AppError("Category name cannot be empty");
    const { data: existing } = await supabase
      .from("account_categories")
      .select("id")
      .eq("school_id", schoolId)
      .ilike("name", name)
      .neq("id", categoryId)
      .maybeSingle();
    if (existing) {
      throw new AppError("A category with this name already exists", "DUPLICATE_CATEGORY", 409);
    }
  }

  const update: Record<string, unknown> = {};
  if (payload.name !== undefined) update.name = payload.name.trim();
  if (payload.description !== undefined) update.description = payload.description?.trim() || null;
  if (payload.is_active !== undefined) update.is_active = payload.is_active;

  const { data, error } = await supabase
    .from("account_categories")
    .update(update)
    .eq("id", categoryId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update category: ${error.message}`);
  if (!data) throw new NotFoundError("Category not found");
  return data as unknown as AccountCategory;
}

export async function deleteAccountCategory(
  schoolId: string,
  categoryId: string
): Promise<{ mode: "deleted" | "deactivated" }> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data: category } = await supabase
    .from("account_categories")
    .select("id, name, type")
    .eq("id", categoryId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!category) throw new NotFoundError("Category not found");

  if (
    category.type === "income" &&
    String(category.name).toLowerCase() === "fee collection"
  ) {
    throw new AppError(
      "The Fee Collection category is managed automatically by the fee income sync and cannot be deleted",
      "SYSTEM_CATEGORY",
      403
    );
  }

  // Never permanently delete a category used by transactions —
  // historical references must keep resolving.
  const { count: usage } = await supabase
    .from("financial_transactions")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if ((usage ?? 0) > 0) {
    const { error } = await supabase
      .from("account_categories")
      .update({ is_active: false })
      .eq("id", categoryId)
      .eq("school_id", schoolId);
    if (error) throw new Error(`Failed to deactivate category: ${error.message}`);
    return { mode: "deactivated" };
  }

  const { error } = await supabase
    .from("account_categories")
    .delete()
    .eq("id", categoryId)
    .eq("school_id", schoolId);
  if (error) throw new Error(`Failed to delete category: ${error.message}`);
  return { mode: "deleted" };
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function createTransaction(
  schoolId: string,
  adminId: string | null,
  adminName: string | null,
  payload: NewTransactionPayload
): Promise<FinancialTransaction> {
  const supabase: SupabaseClient = createSupabaseService();

  if (!PAYMENT_METHODS.includes(payload.payment_method as never)) {
    throw new AppError("Invalid payment method");
  }
  if (!(payload.amount > 0)) throw new AppError("Amount must be a positive value");

  // Category must exist, belong to the school, match the type, and be active
  const { data: category } = await supabase
    .from("account_categories")
    .select("id, name, type, is_active")
    .eq("id", payload.category_id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!category) throw new NotFoundError("Category not found");
  if (category.type !== payload.type) {
    throw new AppError(
      `A ${payload.type} transaction requires a ${payload.type} category`,
      "CATEGORY_TYPE_MISMATCH",
      400
    );
  }
  if (!category.is_active) {
    throw new AppError("Inactive categories cannot be used for new transactions");
  }

  const year = Number(payload.transaction_date.slice(0, 4));
  if (!Number.isFinite(year)) throw new AppError("Invalid transaction date");

  const transaction_number = await generateTransactionNumber(supabase, schoolId, payload.type, year);

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      school_id: schoolId,
      transaction_number,
      type: payload.type,
      category_id: payload.category_id,
      transaction_date: payload.transaction_date,
      amount: payload.amount,
      payment_method: payload.payment_method,
      reference_number: payload.reference_number?.trim() || null,
      party_name: payload.party_name?.trim() || null,
      description: payload.description?.trim() || null,
      created_by: adminId,
      created_by_name: adminName,
    })
    .select("*, category:account_categories(name)")
    .single();

  if (error) throw new Error(`Failed to create transaction: ${error.message}`);

  const tx = txRow(data as Record<string, unknown>);
  await writeAudit(supabase, {
    school_id: schoolId,
    transaction_id: tx.id,
    action: "created",
    new_value: `${tx.transaction_number} (${tx.type}) amount ${tx.amount}`,
    changed_by: adminId,
    changed_by_name: adminName,
  });
  return tx;
}

export async function getTransactionDetail(
  schoolId: string,
  transactionId: string
): Promise<{ transaction: FinancialTransaction; attachments: TransactionAttachment[]; audit: FinancialAuditEntry[] }> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*, category:account_categories(name)")
    .eq("id", transactionId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch transaction: ${error.message}`);
  if (!data) throw new NotFoundError("Transaction not found");

  const [attachmentsRes, auditRes] = await Promise.all([
    supabase
      .from("financial_transaction_attachments")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("financial_audit_log")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    transaction: txRow(data as Record<string, unknown>),
    attachments: (attachmentsRes.data ?? []) as unknown as TransactionAttachment[],
    audit: (auditRes.data ?? []) as unknown as FinancialAuditEntry[],
  };
}

export async function updateTransaction(
  schoolId: string,
  adminId: string | null,
  adminName: string | null,
  transactionId: string,
  payload: UpdateTransactionPayload
): Promise<FinancialTransaction> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data: prev, error: prevError } = await supabase
    .from("financial_transactions")
    .select("*, category:account_categories(name)")
    .eq("id", transactionId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (prevError) throw new Error(`Failed to fetch transaction: ${prevError.message}`);
  if (!prev) throw new NotFoundError("Transaction not found");
  const previous = txRow(prev as Record<string, unknown>);

  if (previous.source === "fee_collection") {
    throw new AppError(
      "This row is auto-generated from fee collections and updates automatically — it cannot be edited",
      "SYSTEM_TRANSACTION",
      403
    );
  }

  if (payload.amount !== undefined && !(payload.amount > 0)) {
    throw new AppError("Amount must be a positive value");
  }
  if (payload.payment_method && !PAYMENT_METHODS.includes(payload.payment_method as never)) {
    throw new AppError("Invalid payment method");
  }

  // If the category changes, it must match the transaction type and be active
  if (payload.category_id && payload.category_id !== previous.category_id) {
    const { data: category } = await supabase
      .from("account_categories")
      .select("id, name, type, is_active")
      .eq("id", payload.category_id)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (!category) throw new NotFoundError("Category not found");
    if (category.type !== previous.type) {
      throw new AppError(
        `A ${previous.type} transaction requires a ${previous.type} category`,
        "CATEGORY_TYPE_MISMATCH",
        400
      );
    }
    if (!category.is_active) {
      throw new AppError("Inactive categories cannot be selected");
    }
  }

  const update: Record<string, unknown> = { updated_by: adminId };
  if (payload.category_id !== undefined) update.category_id = payload.category_id;
  if (payload.transaction_date !== undefined) update.transaction_date = payload.transaction_date;
  if (payload.amount !== undefined) update.amount = payload.amount;
  if (payload.payment_method !== undefined) update.payment_method = payload.payment_method;
  if (payload.reference_number !== undefined) update.reference_number = payload.reference_number?.trim() || null;
  if (payload.party_name !== undefined) update.party_name = payload.party_name?.trim() || null;
  if (payload.description !== undefined) update.description = payload.description?.trim() || null;

  const { data, error } = await supabase
    .from("financial_transactions")
    .update(update)
    .eq("id", transactionId)
    .eq("school_id", schoolId)
    .select("*, category:account_categories(name)")
    .single();
  if (error) throw new Error(`Failed to update transaction: ${error.message}`);

  // Field-level audit entries — never silently overwrite financial data
  const fieldLabels: Record<string, string> = {
    amount: "Amount",
    category_id: "Category",
    transaction_date: "Date",
    payment_method: "Payment method",
    reference_number: "Reference",
    party_name: "Payer/Vendor",
    description: "Description",
  };
  const auditEntries: Array<Partial<FinancialAuditEntry> & { school_id: string; action: string }> = [];
  const categoryName = ((data as Record<string, unknown>).category as { name?: string } | null)?.name ?? null;
  for (const [field, label] of Object.entries(fieldLabels)) {
    if (update[field] === undefined) continue;
    const prevValue = field === "category_id" ? previous.category_name : previous[field as keyof FinancialTransaction];
    const nextValue = field === "category_id" ? categoryName : update[field];
    const prevStr = prevValue === null || prevValue === undefined ? "" : String(prevValue);
    const nextStr = nextValue === null || nextValue === undefined ? "" : String(nextValue);
    if (prevStr !== nextStr) {
      auditEntries.push({
        school_id: schoolId,
        transaction_id: transactionId,
        action: "updated",
        field_name: label,
        previous_value: prevStr,
        new_value: nextStr,
        changed_by: adminId,
        changed_by_name: adminName,
      });
    }
  }
  if (auditEntries.length > 0) {
    await writeAuditMany(supabase, auditEntries);
  }

  return txRow(data as Record<string, unknown>);
}

/** Soft delete — financial records are voided, never destroyed. */
export async function voidTransaction(
  schoolId: string,
  adminId: string | null,
  adminName: string | null,
  transactionId: string
): Promise<FinancialTransaction> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data: existingTx } = await supabase
    .from("financial_transactions")
    .select("source")
    .eq("id", transactionId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if ((existingTx as { source?: string } | null)?.source === "fee_collection") {
    throw new AppError(
      "This row is auto-generated from fee collections — it is voided automatically when that day's payments are removed",
      "SYSTEM_TRANSACTION",
      403
    );
  }

  const { data, error } = await supabase
    .from("financial_transactions")
    .update({ status: "void", updated_by: adminId })
    .eq("id", transactionId)
    .eq("school_id", schoolId)
    .select("*, category:account_categories(name)")
    .single();
  if (error) throw new Error(`Failed to void transaction: ${error.message}`);
  if (!data) throw new NotFoundError("Transaction not found");

  const tx = txRow(data as Record<string, unknown>);
  await writeAudit(supabase, {
    school_id: schoolId,
    transaction_id: tx.id,
    action: "voided",
    previous_value: "active",
    new_value: "void",
    changed_by: adminId,
    changed_by_name: adminName,
  });
  return tx;
}

// ── Statement ─────────────────────────────────────────────────────────────────

export interface StatementParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: "income" | "expense";
  categoryId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  createdBy?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export async function getStatement(
  schoolId: string,
  params: StatementParams = {}
): Promise<{ data: FinancialTransaction[]; total: number; summary: StatementSummary }> {
  const supabase: SupabaseClient = createSupabaseService();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(200, Math.max(1, params.limit ?? 25));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("financial_transactions")
    .select("*, category:account_categories(name)", { count: "exact" })
    .eq("school_id", schoolId)
    .eq("status", "active");

  if (params.type) query = query.eq("type", params.type);
  if (params.categoryId) query = query.eq("category_id", params.categoryId);
  if (params.paymentMethod) query = query.eq("payment_method", params.paymentMethod);
  if (params.dateFrom) query = query.gte("transaction_date", params.dateFrom);
  if (params.dateTo) query = query.lte("transaction_date", params.dateTo);
  if (params.amountMin !== undefined) query = query.gte("amount", params.amountMin);
  if (params.amountMax !== undefined) query = query.lte("amount", params.amountMax);
  if (params.createdBy) query = query.eq("created_by", params.createdBy);
  if (params.search?.trim()) {
    const q = params.search.trim();
    query = query.or(
      `transaction_number.ilike.%${q}%,description.ilike.%${q}%,party_name.ilike.%${q}%,reference_number.ilike.%${q}%`
    );
  }

  const sortBy = (TRANSACTION_SORT_FIELDS as readonly string[]).includes(params.sortBy ?? "")
    ? (params.sortBy as string)
    : "transaction_date";
  const sortDir = params.sortDir ?? "desc";
  query = query.order(sortBy, { ascending: sortDir === "asc" }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch statement: ${error.message}`);

  // Server-side aggregate totals using the same filters (DB function)
  const { data: summaryData, error: summaryError } = await supabase.rpc(
    "financial_statement_summary",
    {
      p_school_id: schoolId,
      p_type: params.type ?? null,
      p_category_id: params.categoryId ?? null,
      p_payment_method: params.paymentMethod ?? null,
      p_date_from: params.dateFrom ?? null,
      p_date_to: params.dateTo ?? null,
      p_amount_min: params.amountMin ?? null,
      p_amount_max: params.amountMax ?? null,
      p_created_by: params.createdBy ?? null,
      p_search: params.search?.trim() || null,
    }
  );
  if (summaryError) throw new Error(`Failed to compute summary: ${summaryError.message}`);

  const row = (Array.isArray(summaryData) ? summaryData[0] : summaryData) as
    | { total_income: string | number; total_expenses: string | number; transaction_count: string | number }
    | undefined;
  const totalIncome = Number(row?.total_income ?? 0);
  const totalExpenses = Number(row?.total_expenses ?? 0);

  return {
    data: (data ?? []).map((r) => txRow(r as Record<string, unknown>)),
    total: count ?? 0,
    summary: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_balance: totalIncome - totalExpenses,
      transaction_count: Number(row?.transaction_count ?? 0),
    },
  };
}

export async function getQuickSummary(schoolId: string): Promise<QuickSummary> {
  const supabase: SupabaseClient = createSupabaseService();
  const today = todayStr();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const fetchTotals = async (dateFrom?: string, dateTo?: string) => {
    const { data, error } = await supabase.rpc("financial_statement_summary", {
      p_school_id: schoolId,
      p_date_from: dateFrom ?? null,
      p_date_to: dateTo ?? null,
    });
    if (error) throw new Error(`Failed to compute summary: ${error.message}`);
    const r = (Array.isArray(data) ? data[0] : data) as
      | { total_income: string | number; total_expenses: string | number }
      | undefined;
    return {
      income: Number(r?.total_income ?? 0),
      expenses: Number(r?.total_expenses ?? 0),
    };
  };

  const [todayTotals, monthTotals, allTotals] = await Promise.all([
    fetchTotals(today, today),
    fetchTotals(monthStart, today),
    fetchTotals(),
  ]);

  return {
    today_income: todayTotals.income,
    today_expenses: todayTotals.expenses,
    month_income: monthTotals.income,
    month_expenses: monthTotals.expenses,
    net_balance: allTotals.income - allTotals.expenses,
  };
}

// ── Attachments ───────────────────────────────────────────────────────────────

export async function uploadTransactionAttachment(
  schoolId: string,
  adminId: string | null,
  adminName: string | null,
  transactionId: string,
  file: File
): Promise<TransactionAttachment> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data: tx } = await supabase
    .from("financial_transactions")
    .select("id")
    .eq("id", transactionId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!tx) throw new NotFoundError("Transaction not found");

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${schoolId}/${transactionId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("financial-attachments")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

  const { data, error } = await supabase
    .from("financial_transaction_attachments")
    .insert({
      school_id: schoolId,
      transaction_id: transactionId,
      file_name: file.name,
      storage_key: path,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: adminId,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to record attachment: ${error.message}`);

  await writeAudit(supabase, {
    school_id: schoolId,
    transaction_id: transactionId,
    action: "attachment_added",
    new_value: file.name,
    changed_by: adminId,
    changed_by_name: adminName,
  });

  return data as unknown as TransactionAttachment;
}

export async function deleteTransactionAttachment(
  schoolId: string,
  adminId: string | null,
  adminName: string | null,
  transactionId: string,
  attachmentId: string
): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error: fetchError } = await supabase
    .from("financial_transaction_attachments")
    .select("id, file_name, storage_key")
    .eq("id", attachmentId)
    .eq("transaction_id", transactionId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (fetchError || !data) throw new NotFoundError("Attachment not found");

  await supabase.storage.from("financial-attachments").remove([data.storage_key]);

  const { error } = await supabase
    .from("financial_transaction_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("transaction_id", transactionId)
    .eq("school_id", schoolId);
  if (error) throw new Error(`Failed to delete attachment: ${error.message}`);

  await writeAudit(supabase, {
    school_id: schoolId,
    transaction_id: transactionId,
    action: "attachment_removed",
    previous_value: data.file_name,
    changed_by: adminId,
    changed_by_name: adminName,
  });
}

export async function getAttachmentFile(
  schoolId: string,
  transactionId: string,
  attachmentId: string
): Promise<{ data: Blob; fileName: string; mimeType: string }> {
  const supabase: SupabaseClient = createSupabaseService();

  const { data, error } = await supabase
    .from("financial_transaction_attachments")
    .select("file_name, mime_type, storage_key")
    .eq("id", attachmentId)
    .eq("transaction_id", transactionId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error || !data) throw new NotFoundError("Attachment not found");

  const { data: file, error: downloadError } = await supabase.storage
    .from("financial-attachments")
    .download(data.storage_key);
  if (downloadError || !file) throw new Error("Failed to load attachment");

  return {
    data: file,
    fileName: data.file_name,
    mimeType: data.mime_type,
  };
}

