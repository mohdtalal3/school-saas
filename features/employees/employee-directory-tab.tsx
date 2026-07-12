"use client";

import * as React from "react";
import { DirectoryTable, type DirectoryColumn } from "@/components/ui/directory-table";
import type { Employee } from "@/types/school.types";

async function fetchEmployeesForDirectory(
  schoolId: string,
  params: { page: number; limit: number; search: string; active: boolean | "all"; classId?: string }
): Promise<{ data: Employee[]; total: number }> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    active: params.active === "all" ? "all" : String(params.active),
  });
  if (params.search) qs.set("search", params.search);
  const res = await fetch(`/api/employees/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

const columns: DirectoryColumn<Employee>[] = [
  {
    key: "employee_code",
    label: "Code",
    className: "font-mono text-xs",
  },
  {
    key: "name",
    label: "Name",
    render: (e) => <span className="font-medium">{e.name}</span>,
  },
  {
    key: "role",
    label: "Role",
  },
  {
    key: "phone",
    label: "Phone",
    render: (e) => e.phone ?? "—",
  },
  {
    key: "email",
    label: "Email",
    render: (e) => e.email ?? "—",
  },
  {
    key: "cnic",
    label: "CNIC",
    render: (e) => e.cnic ?? "—",
  },
  {
    key: "date_of_joining",
    label: "Joined",
    render: (e) => new Date(e.date_of_joining).toLocaleDateString(),
  },
];

const exportColumns: DirectoryColumn<Employee>[] = [
  { key: "employee_code", label: "Employee Code", exportValue: (e) => e.employee_code ?? "" },
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "father_husband_name", label: "Father/Husband Name", exportValue: (e) => e.father_husband_name ?? "" },
  { key: "gender", label: "Gender", exportValue: (e) => e.gender ?? "" },
  { key: "religion", label: "Religion", exportValue: (e) => e.religion ?? "" },
  { key: "cnic", label: "CNIC", exportValue: (e) => e.cnic ?? "" },
  { key: "date_of_birth", label: "Date of Birth", exportValue: (e) => e.date_of_birth ?? "" },
  { key: "date_of_joining", label: "Date of Joining" },
  { key: "salary", label: "Salary", exportValue: (e) => e.salary ?? "" },
  { key: "experience", label: "Experience", exportValue: (e) => e.experience ?? "" },
  { key: "phone", label: "Phone", exportValue: (e) => e.phone ?? "" },
  { key: "email", label: "Email", exportValue: (e) => e.email ?? "" },
  { key: "address", label: "Address", exportValue: (e) => e.address ?? "" },
  { key: "education", label: "Education", exportValue: (e) => e.education ?? "" },
  { key: "is_active", label: "Status", exportValue: (e) => (e.is_active ? "Active" : "Inactive") },
];

interface Props {
  schoolId: string;
}

export function EmployeeDirectoryTab({ schoolId }: Props) {
  return (
    <DirectoryTable<Employee>
      schoolId={schoolId}
      fetchFn={fetchEmployeesForDirectory}
      queryKeyPrefix="employee-directory"
      columns={columns}
      exportColumns={exportColumns}
      exportFilename="employees"
      entityLabel="employees"
      toggleEndpoint={`/api/employees/${schoolId}/{id}`}
    />
  );
}
