"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  X,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  FileText,
  Mail,
  Phone,
  Coins,
  CalendarDays,
  GraduationCap,
  Paperclip,
  CreditCard,
  Table,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { useServerPagination } from "@/lib/use-server-pagination";
import { useToast } from "@/components/ui/toast";
import { EmployeeForm } from "./employee-form";
import { EmployeeViewDialog } from "./employee-view-dialog";
import { ManageLoginTab } from "./manage-login-tab";
import { JobOfferTab } from "./job-offer-tab";
import { AttachmentsTab } from "./attachments-tab";
import { IdCardsTab } from "./id-cards-tab";
import { EmployeeDirectoryTab } from "./employee-directory-tab";
import type { ActiveFilter } from "@/components/ui/directory-table";
import type { Employee } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchEmployees(
  schoolId: string,
  params: { page: number; limit: number; search: string; active?: boolean | "all" }
): Promise<{ data: Employee[]; total: number; counts?: { active: number; inactive: number; total: number } }> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) qs.set("search", params.search);
  if (params.active !== undefined) qs.set("active", params.active === "all" ? "all" : String(params.active));
  const res = await fetch(`/api/employees/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

async function createEmployee(
  schoolId: string,
  payload: Parameters<typeof import("@/services/employee.service").createEmployee>[1]
): Promise<{ employee: Employee; username: string; password: string }> {
  const res = await fetch(`/api/employees/${schoolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to create");
  return data.data;
}

async function updateEmployeeRecord(
  schoolId: string,
  employeeId: string,
  payload: Partial<Employee>
): Promise<Employee> {
  const { password_hash: _ph, ...safe } = payload;
  const res = await fetch(`/api/employees/${schoolId}/${employeeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safe),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to update");
  return data.data;
}

async function deleteEmployeeRecord(
  schoolId: string,
  employeeId: string
): Promise<void> {
  const res = await fetch(`/api/employees/${schoolId}/${employeeId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete");
}

// ── Credentials Display Dialog ───────────────────────────────────────────────────

function CredentialsDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: { employee: Employee; username: string; password: string } | null;
}) {
  const { toast } = useToast();

  function copy(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: `${label} copied`, variant: "success" }))
      .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle>Login Created</DialogTitle>
              <DialogDescription>
                Share these credentials with the employee. Password can be
                changed later from the Manage Login tab.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {employee && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
              <Avatar className="h-14 w-14">
                {employee.employee.photo_url && (
                  <AvatarImage
                    src={employee.employee.photo_url}
                    alt={employee.employee.name}
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {getInitials(employee.employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {employee.employee.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {employee.employee.role}
                </p>
                {employee.employee.employee_code && (
                  <p className="text-xs text-muted-foreground">
                    {employee.employee.employee_code}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Username
                  </p>
                  <button
                    onClick={() => copy(employee.username, "Username")}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <p className="font-mono text-lg font-semibold tracking-wide">
                  {employee.username}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on CNIC (digits only)
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
                    Default Password
                  </p>
                  <button
                    onClick={() => copy(employee.password, "Password")}
                    className="text-xs text-amber-700 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <p className="font-mono text-lg font-semibold tracking-wide text-amber-800">
                  {employee.password}
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  CNIC without dashes — must be changed after first login
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Employee card (grid item) ──────────────────────────────────────────────────

function EmployeeCard({
  employee,
  onEdit,
  onView,
  onDelete,
}: {
  employee: Employee;
  onEdit: (e: Employee) => void;
  onView: (e: Employee) => void;
  onDelete: (e: Employee) => void;
}) {
  const joiningYear = employee.date_of_joining
    ? new Date(employee.date_of_joining).getFullYear()
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
    >
      {/* Top: avatar + status + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-background">
            {employee.photo_url && (
              <AvatarImage src={employee.photo_url} alt={employee.name} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {employee.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {employee.role}
            </p>
          </div>
        </div>

        {/* Hover-revealed actions */}
        <div className="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onView(employee)}
            title="View"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(employee)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive/70 hover:text-destructive"
            onClick={() => onDelete(employee)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Code chip */}
      {employee.employee_code && (
        <span className="self-start rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          {employee.employee_code}
        </span>
      )}

      {/* Detail rows */}
      <div className="space-y-1 text-xs text-muted-foreground">
        {employee.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{employee.email}</span>
          </div>
        )}
        {employee.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{employee.phone}</span>
          </div>
        )}
        {employee.salary != null && (
          <div className="flex items-center gap-1.5">
            <Coins className="h-3 w-3 shrink-0" />
            <span className="font-medium text-primary">
              Rs. {employee.salary.toLocaleString()}
            </span>
          </div>
        )}
        {joiningYear && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span>Joined {joiningYear}</span>
          </div>
        )}
        {employee.education && (
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3 w-3 shrink-0" />
            <span className="truncate">{employee.education}</span>
          </div>
        )}
      </div>

      {/* Footer row: action buttons */}
      <div className="mt-auto flex items-center gap-1 border-t pt-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onEdit(employee)}
        >
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onView(employee)}
        >
          <Eye className="mr-1 h-3 w-3" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs text-destructive/70 hover:text-destructive"
          onClick={() => onDelete(employee)}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Delete
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface EmployeeManagementProps {
  schoolId: string;
}

type DialogMode = "add" | "edit" | "delete";

export function EmployeeManagement({ schoolId }: EmployeeManagementProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = React.useState<"all" | "list" | "login" | "offer" | "attachments" | "idcards">("all");
  const { page, pageSize, search, setPage, setSearch, handlePageSizeChange } = useServerPagination();
  const [mode, setMode] = React.useState<DialogMode | null>(null);
  const [selected, setSelected] = React.useState<Employee | null>(null);
  const [credentials, setCredentials] = React.useState<{
    employee: Employee;
    username: string;
    password: string;
  } | null>(null);
  const [showCredentials, setShowCredentials] = React.useState(false);

  const [empActiveFilter, setEmpActiveFilter] = React.useState<ActiveFilter>("active");

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["employees", schoolId, page, pageSize, debouncedSearch, empActiveFilter],
    queryFn: () => fetchEmployees(schoolId, {
      page,
      limit: pageSize,
      search: debouncedSearch,
      active: empActiveFilter === "all" ? "all" : empActiveFilter === "active",
    }),
  });
  const employees = data?.data ?? [];
  const totalEmployees = data?.total ?? 0;
  const counts = data?.counts;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createEmployee>[1]) =>
      createEmployee(schoolId, payload),
    onSuccess: (result) => {
      qc.setQueryData<Employee[]>(["employees", schoolId], (prev) =>
        [result.employee, ...(prev ?? [])]
      );
      setMode(null);
      setSelected(null);
      setCredentials(result);
      setShowCredentials(true);
      setTab("all");
      toast({
        title: "Employee added",
        description: `Employee code: ${result.employee.employee_code}`,
        variant: "success",
      });
    },
    onError: (e) => {
      toast({
        title: "Failed to add employee",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Employee>) =>
      updateEmployeeRecord(schoolId, selected!.id, payload),
    onSuccess: (updated) => {
      qc.setQueryData<Employee[]>(["employees", schoolId], (prev) =>
        (prev ?? []).map((e) => (e.id === updated.id ? updated : e))
      );
      setMode(null);
      setSelected(null);
      toast({ title: "Employee updated", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEmployeeRecord(schoolId, selected!.id),
    onSuccess: () => {
      qc.setQueryData<Employee[]>(["employees", schoolId], (prev) =>
        (prev ?? []).filter((e) => e.id !== selected!.id)
      );
      setMode(null);
      setSelected(null);
      toast({ title: "Employee removed", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openAdd() {
    setSelected(null);
    setMode("add");
  }

  function openEdit(e: Employee) {
    setSelected(e);
    setMode("edit");
  }

  function openView(e: Employee) {
    setSelected(e);
  }

  function openDelete(e: Employee) {
    setSelected(e);
    setMode("delete");
  }

  function closeDialog() {
    setMode(null);
    setSelected(null);
  }

  return (
    <>
      {/* Credentials dialog */}
      <CredentialsDialog
        open={showCredentials}
        onOpenChange={setShowCredentials}
        employee={credentials}
      />

      {/* View dialog */}
      <EmployeeViewDialog
        open={selected !== null && mode === null}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setMode(null);
          }
        }}
        employee={selected}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={mode === "delete"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Remove Employee?</DialogTitle>
                <DialogDescription>
                  {selected?.name} will be removed from active employees.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit dialog */}
      <Dialog
        open={mode === "add" || mode === "edit"}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>
                  {mode === "add" ? "Add New Employee" : "Edit Employee"}
                </DialogTitle>
                <DialogDescription>
                  {mode === "add"
                    ? "Fill in the details below. Login credentials will be auto-generated."
                    : `Editing ${selected?.name}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {mode !== null && (
            <EmployeeForm
              schoolId={schoolId}
              initialData={mode === "edit" ? selected : null}
              currentEmployeeId={mode === "edit" ? selected?.id : undefined}
              onSubmit={async (payload) => {
                if (mode === "add") {
                  return createMutation.mutateAsync(
                    payload as Parameters<typeof createEmployee>[1]
                  );
                } else {
                  return updateMutation.mutateAsync(
                    payload as Partial<Employee>
                  );
                }
              }}
              onSuccess={() => {
                setMode(null);
                setSelected(null);
              }}
              submitLabel={mode === "add" ? "Add Employee" : "Update Employee"}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Page content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Employees
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your school&apos;s staff members and their login credentials.
            </p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "all" | "login" | "offer" | "attachments" | "idcards")}
          className="w-full"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="w-full sm:w-auto overflow-x-auto">
              <TabsTrigger value="all" className="gap-2 flex-1 sm:flex-none">
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">All Employees</span>
                <span className="sm:hidden">All</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                  {totalEmployees}
                </span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <Table className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Basic List</span>
                <span className="sm:hidden">List</span>
              </TabsTrigger>
              <TabsTrigger value="login" className="gap-2">
                <KeyRound className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Manage Login</span>
                <span className="sm:hidden">Login</span>
              </TabsTrigger>
              <TabsTrigger value="offer" className="gap-2">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Job Offer Letter</span>
                <span className="sm:hidden">Offer</span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Attachments</span>
                <span className="sm:hidden">Files</span>
              </TabsTrigger>
              <TabsTrigger value="idcards" className="gap-2">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ID Cards</span>
                <span className="sm:hidden">IDs</span>
              </TabsTrigger>
            </TabsList>

            {(tab === "all" || tab === "list" || tab === "login") && (
              <div className="flex flex-wrap items-center gap-2">
                {(tab === "all" || tab === "list") && (
                <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
                  {(["active", "inactive", "all"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setEmpActiveFilter(f); setPage(1); }}
                      className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                        empActiveFilter === f
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "all" ? "All" : f}
                    </button>
                  ))}
                </div>
                )}
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, role, code, phone, CNIC..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-8"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── All Employees tab (grid view) ── */}
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Staff Directory
                  {counts && (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                        {counts.active} Active
                      </span>
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                        {counts.inactive} Inactive
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {counts.total} Total
                      </span>
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : employees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Users className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="font-medium">
                      {search ? "No employees found" : "No employees yet"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {search
                        ? `No results for "${search}"`
                        : "Add your first employee to get started."}
                    </p>
                    {!search && (
                      <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={openAdd}
                      >
                        <Plus className="h-4 w-4" />
                        Add Employee
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      <AnimatePresence>
                        {employees.map((employee) => (
                          <EmployeeCard
                            key={employee.id}
                            employee={employee}
                            onEdit={openEdit}
                            onView={openView}
                            onDelete={openDelete}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="mt-4">
                      <Pagination
                        page={page}
                        pageSize={pageSize}
                        total={totalEmployees}
                        onPageChange={setPage}
                        onPageSizeChange={handlePageSizeChange}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Basic List tab ── */}
          <TabsContent value="list" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Table className="h-4 w-4 text-muted-foreground" />
                  Employee List
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {totalEmployees}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmployeeDirectoryTab
                  schoolId={schoolId}
                  controlledSearch={search}
                  controlledSetSearch={setSearch}
                  controlledActiveFilter={empActiveFilter}
                  controlledSetActiveFilter={setEmpActiveFilter}
                  hideFilterBar
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Manage Login tab ── */}
          <TabsContent value="login" className="mt-4">
            <ManageLoginTab
              schoolId={schoolId}
              controlledSearch={search}
              controlledSetSearch={setSearch}
              hideSearchBar
            />
          </TabsContent>

          {/* ── Job Offer Letter tab ── */}
          <TabsContent value="offer" className="mt-4">
            <JobOfferTab schoolId={schoolId} />
          </TabsContent>

          {/* ── Attachments tab ── */}
          <TabsContent value="attachments" className="mt-4">
            <AttachmentsTab schoolId={schoolId} />
          </TabsContent>

          {/* ── ID Cards tab ── */}
          <TabsContent value="idcards" className="mt-4">
            <IdCardsTab schoolId={schoolId} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </>
  );
}