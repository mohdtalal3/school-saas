import type { SchoolClass } from "@/types/school.types";

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json.error || "Request failed");
  return json.data as T;
}

export async function fetchClasses(schoolId: string): Promise<SchoolClass[]> {
  const result = await apiRequest<{ data: SchoolClass[] }>(`/api/classes/${schoolId}?limit=1000`);
  return result.data;
}

export const jsonRequest = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
