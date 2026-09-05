import type {
  AccountCategory,
  FinancialTransaction,
  TransactionAttachment,
  FinancialAuditEntry,
  StatementSummary,
  QuickSummary,
} from "@/types/school.types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json.data as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== null
  );
  return new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)])
  ).toString();
}

// ── Categories ────────────────────────────────────────────────────────────────

export interface CategoryFilters {
  type?: "income" | "expense";
  search?: string;
  status?: "active" | "inactive" | "all";
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export function fetchCategories(schoolId: string, filters: CategoryFilters = {}) {
  const query = qs({
    type: filters.type,
    search: filters.search,
    status: filters.status !== "all" ? filters.status : undefined,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  });
  return request<{ data: AccountCategory[]; counts: { active: number; inactive: number } }>(
    `/api/accounts/${schoolId}/categories${query ? `?${query}` : ""}`
  );
}

export function createCategoryApi(
  schoolId: string,
  payload: { name: string; type: "income" | "expense"; description?: string | null }
) {
  return request<AccountCategory>(`/api/accounts/${schoolId}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateCategoryApi(
  schoolId: string,
  categoryId: string,
  payload: { name?: string; description?: string | null; is_active?: boolean }
) {
  return request<AccountCategory>(
    `/api/accounts/${schoolId}/categories/${categoryId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function deleteCategoryApi(schoolId: string, categoryId: string) {
  return request<{ mode: "deleted" | "deactivated" }>(
    `/api/accounts/${schoolId}/categories/${categoryId}`,
    { method: "DELETE" }
  );
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface StatementFilters {
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

export function fetchStatement(schoolId: string, filters: StatementFilters) {
  const query = qs({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    type: filters.type,
    categoryId: filters.categoryId,
    paymentMethod: filters.paymentMethod,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
    createdBy: filters.createdBy,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  });
  return request<{ data: FinancialTransaction[]; total: number; summary: StatementSummary }>(
    `/api/accounts/${schoolId}/transactions${query ? `?${query}` : ""}`
  );
}

export function createTransactionApi(
  schoolId: string,
  payload: {
    type: "income" | "expense";
    category_id: string;
    transaction_date: string;
    amount: number;
    payment_method: string;
    reference_number?: string | null;
    party_name?: string | null;
    description?: string | null;
  }
) {
  return request<FinancialTransaction>(`/api/accounts/${schoolId}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchTransactionDetail(schoolId: string, transactionId: string) {
  return request<{
    transaction: FinancialTransaction;
    attachments: TransactionAttachment[];
    audit: FinancialAuditEntry[];
  }>(`/api/accounts/${schoolId}/transactions/${transactionId}`);
}

export function updateTransactionApi(
  schoolId: string,
  transactionId: string,
  payload: Record<string, unknown>
) {
  return request<FinancialTransaction>(
    `/api/accounts/${schoolId}/transactions/${transactionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function voidTransactionApi(schoolId: string, transactionId: string) {
  return request<FinancialTransaction>(
    `/api/accounts/${schoolId}/transactions/${transactionId}`,
    { method: "DELETE" }
  );
}

// ── Attachments ───────────────────────────────────────────────────────────────

export function uploadAttachmentApi(
  schoolId: string,
  transactionId: string,
  file: File
) {
  const formData = new FormData();
  formData.append("file", file);
  return request<TransactionAttachment>(
    `/api/accounts/${schoolId}/transactions/${transactionId}/attachments`,
    { method: "POST", body: formData }
  );
}

export function deleteAttachmentApi(
  schoolId: string,
  transactionId: string,
  attachmentId: string
) {
  return request<{ ok: boolean }>(
    `/api/accounts/${schoolId}/transactions/${transactionId}/attachments/${attachmentId}`,
    { method: "DELETE" }
  );
}

// ── Quick summary ─────────────────────────────────────────────────────────────

export function fetchQuickSummary(schoolId: string) {
  return request<QuickSummary>(`/api/accounts/${schoolId}/summary`);
}
