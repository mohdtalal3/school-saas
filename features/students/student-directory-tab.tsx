"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { DirectoryTable, type DirectoryColumn, type ActiveFilter } from "@/components/ui/directory-table";
import type { StudentWithClass, SchoolClass } from "@/types/school.types";

async function fetchStudentsForDirectory(
  schoolId: string,
  params: { page: number; limit: number; search: string; active: boolean | "all"; classId?: string; isFree?: boolean }
): Promise<{ data: StudentWithClass[]; total: number }> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    active: params.active === "all" ? "all" : String(params.active),
  });
  if (params.search) qs.set("search", params.search);
  if (params.classId) qs.set("classId", params.classId);
  if (params.isFree) qs.set("isFree", "true");
  const res = await fetch(`/api/students/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

async function fetchClasses(schoolId: string): Promise<SchoolClass[]> {
  const res = await fetch(`/api/classes/${schoolId}?limit=1000`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data.data;
}

const columns: DirectoryColumn<StudentWithClass>[] = [
  {
    key: "registration_no",
    label: "Reg No",
    className: "font-mono text-xs",
  },
  {
    key: "name",
    label: "Name",
    render: (s) => <span className="font-medium">{s.name}</span>,
  },
  {
    key: "class_name",
    label: "Class",
    render: (s) => s.class_name ?? "—",
  },
  {
    key: "father_name",
    label: "Father",
    render: (s) => s.father_name ?? "—",
  },
  {
    key: "mobile",
    label: "Mobile",
    render: (s) => s.mobile ?? "—",
  },
  {
    key: "gender",
    label: "Gender",
    render: (s) => s.gender ?? "—",
  },
  {
    key: "is_free",
    label: "Free",
    render: (s) => s.is_free
      ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600">Free</span>
      : "—",
  },
  {
    key: "date_of_admission",
    label: "Admitted",
    render: (s) => new Date(s.date_of_admission).toLocaleDateString(),
  },
];

const exportColumns: DirectoryColumn<StudentWithClass>[] = [
  { key: "registration_no", label: "Registration No", exportValue: (s) => s.registration_no ?? "" },
  { key: "name", label: "Name" },
  { key: "class_name", label: "Class", exportValue: (s) => s.class_name ?? "" },
  { key: "date_of_admission", label: "Date of Admission" },
  { key: "discount", label: "Discount" },
  { key: "mobile", label: "Mobile", exportValue: (s) => s.mobile ?? "" },
  { key: "date_of_birth", label: "Date of Birth", exportValue: (s) => s.date_of_birth ?? "" },
  { key: "gender", label: "Gender", exportValue: (s) => s.gender ?? "" },
  { key: "blood_group", label: "Blood Group", exportValue: (s) => s.blood_group ?? "" },
  { key: "religion", label: "Religion", exportValue: (s) => s.religion ?? "" },
  { key: "father_name", label: "Father Name", exportValue: (s) => s.father_name ?? "" },
  { key: "father_nic", label: "Father NIC", exportValue: (s) => s.father_nic ?? "" },
  { key: "father_profession", label: "Father Profession", exportValue: (s) => s.father_profession ?? "" },
  { key: "address", label: "Address", exportValue: (s) => s.address ?? "" },
  { key: "is_orphan", label: "Orphan", exportValue: (s) => (s.is_orphan ? "Yes" : "No") },
  { key: "is_osc", label: "OSC", exportValue: (s) => (s.is_osc ? "Yes" : "No") },
  { key: "is_free", label: "Free Education", exportValue: (s) => (s.is_free ? "Yes" : "No") },
  { key: "previous_balance", label: "Previous Balance", exportValue: (s) => String(s.previous_balance ?? 0) },
  { key: "annual_dues_discount", label: "Annual Dues Discount", exportValue: (s) => String(s.annual_dues_discount ?? 0) },
  { key: "previous_annual_due", label: "Previous Annual Due", exportValue: (s) => String(s.previous_annual_due ?? 0) },
  { key: "is_active", label: "Status", exportValue: (s) => (s.is_active ? "Active" : "Inactive") },
];

interface Props {
  schoolId: string;
  controlledSearch?: string;
  controlledSetSearch?: (v: string) => void;
  controlledActiveFilter?: ActiveFilter;
  controlledSetActiveFilter?: (f: ActiveFilter) => void;
  controlledClassId?: string;
  controlledSetClassId?: (v: string) => void;
  controlledIsFree?: boolean;
  hideFilterBar?: boolean;
}

export function StudentDirectoryTab({
  schoolId,
  controlledSearch,
  controlledSetSearch,
  controlledActiveFilter,
  controlledSetActiveFilter,
  controlledClassId,
  controlledSetClassId,
  controlledIsFree,
  hideFilterBar,
}: Props) {
  const { data: classes = [] } = useQuery({
    queryKey: ["classes", schoolId, "directory"],
    queryFn: () => fetchClasses(schoolId),
  });

  return (
    <DirectoryTable<StudentWithClass>
      schoolId={schoolId}
      fetchFn={fetchStudentsForDirectory}
      queryKeyPrefix="student-directory"
      columns={columns}
      exportColumns={exportColumns}
      exportFilename="students"
      entityLabel="students"
      toggleEndpoint={`/api/students/${schoolId}/{id}`}
      classFilter={{ classes }}
      controlledSearch={controlledSearch}
      controlledSetSearch={controlledSetSearch}
      controlledActiveFilter={controlledActiveFilter}
      controlledSetActiveFilter={controlledSetActiveFilter}
      controlledClassId={controlledClassId}
      controlledSetClassId={controlledSetClassId}
      controlledIsFree={controlledIsFree}
      hideFilterBar={hideFilterBar}
    />
  );
}
