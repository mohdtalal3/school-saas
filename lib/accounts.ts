// ── Accounts / Finance shared constants & helpers ────────────
// Shared by client features, API routes, and services so payment
// methods and sort options are never duplicated or hardcoded
// per-screen.

export const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Bank Deposit",
  "Cheque",
  "Card",
  "Other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const TRANSACTION_SORT_FIELDS = [
  "transaction_date",
  "transaction_number",
  "amount",
  "type",
  "created_at",
] as const;

export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number];

export const CATEGORY_SORT_FIELDS = ["name", "created_at", "updated_at"] as const;

export type CategorySortField = (typeof CATEGORY_SORT_FIELDS)[number];

/** Formats an amount with the school's currency symbol, e.g. "Rs 25,000". */
export function formatCurrency(amount: number, currencySymbol = "$"): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${currencySymbol} ${formatted}`;
}

/** Builds a signed download URL path for a transaction attachment. */
export function attachmentDownloadUrl(
  schoolId: string,
  transactionId: string,
  attachmentId: string
): string {
  return `/api/accounts/${schoolId}/transactions/${transactionId}/attachments/${attachmentId}/download`;
}
