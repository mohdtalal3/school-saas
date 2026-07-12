"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  KeyRound,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Users,
  ShieldCheck,
  Mail,
  Phone,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Employee } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchEmployees(schoolId: string): Promise<Employee[]> {
  const res = await fetch(`/api/employees/${schoolId}`);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to load");
  return data.data;
}

interface CredentialsPayload {
  login_username: string;
  password?: string;
  is_login_active: boolean;
}

async function updateEmployeeCredentials(
  schoolId: string,
  employeeId: string,
  payload: CredentialsPayload
): Promise<Employee> {
  const res = await fetch(`/api/employees/${schoolId}/${employeeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.error || "Failed to update credentials");
  return data.data;
}

// ── Card component ────────────────────────────────────────────────────────────

function LoginCard({
  employee,
  onEdit,
  onToggleActive,
  isToggling,
}: {
  employee: Employee;
  onEdit: (e: Employee) => void;
  onToggleActive: (e: Employee) => void;
  isToggling: boolean;
}) {
  const { toast } = useToast();

  function copy(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: `${label} copied`, variant: "success" }))
      .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
    >
      {/* Top: avatar + status */}
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

        {/* Status badge */}
        {employee.is_login_active ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Active
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
            <AlertTriangle className="h-2.5 w-2.5" />
            Disabled
          </span>
        )}
      </div>

      {/* Code chip */}
      {employee.employee_code && (
        <span className="self-start rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          {employee.employee_code}
        </span>
      )}

      {/* Username row */}
      <div className="rounded-md bg-muted/40 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Username
          </span>
          <button
            onClick={() => copy(employee.login_username, "Username")}
            className="text-muted-foreground hover:text-foreground"
            title="Copy username"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
        <p className="truncate font-mono text-sm">{employee.login_username}</p>
      </div>

      {/* Contact rows (compact) */}
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
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center gap-1 border-t pt-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 px-2 text-xs"
          onClick={() => onEdit(employee)}
        >
          <KeyRound className="mr-1 h-3 w-3" />
          Change
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 px-2 text-xs"
          disabled={isToggling}
          onClick={() => onToggleActive(employee)}
          title={employee.is_login_active ? "Disable login" : "Enable login"}
        >
          <Power className="mr-1 h-3 w-3" />
          {employee.is_login_active ? "Disable" : "Enable"}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Edit credentials dialog ───────────────────────────────────────────────────

function EditCredentialsDialog({
  open,
  onOpenChange,
  employee,
  schoolId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: Employee | null;
  schoolId: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editUsername, setEditUsername] = React.useState("");
  const [editPassword, setEditPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (employee) {
      setEditUsername(employee.login_username);
      setEditPassword("");
      setShowPassword(false);
    }
  }, [employee]);

  const credMutation = useMutation({
    mutationFn: (payload: CredentialsPayload) =>
      updateEmployeeCredentials(schoolId, employee!.id, payload),
    onSuccess: (updated) => {
      qc.setQueryData<Employee[]>(["employees", schoolId], (prev) =>
        (prev ?? []).map((e) => (e.id === updated.id ? updated : e))
      );
      onOpenChange(false);
      toast({ title: "Login updated", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  function resetToCnic() {
    const cnic = employee?.cnic?.replace(/\D/g, "");
    if (!cnic) {
      toast({
        title: "No CNIC on file",
        description: "Cannot reset to CNIC if CNIC is not set.",
        variant: "destructive",
      });
      return;
    }
    setEditUsername(cnic);
    setEditPassword(cnic);
  }

  function save() {
    if (!employee) return;
    const payload: CredentialsPayload = {
      login_username: editUsername.trim() || employee.login_username,
      is_login_active: employee.is_login_active,
    };
    if (editPassword.trim()) payload.password = editPassword;
    credMutation.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Change Credentials</DialogTitle>
              <DialogDescription>
                {employee?.name} · {employee?.login_username}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {employee && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <div className="relative">
                <Input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="pr-9 font-mono"
                  placeholder="username"
                />
                <button
                  type="button"
                  onClick={() => setEditUsername("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Clear"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                New Password{" "}
                <span className="text-muted-foreground">
                  (leave blank to keep current)
                </span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="pr-16 font-mono"
                  placeholder="••••••••"
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-muted-foreground hover:text-foreground"
                    title={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {employee.cnic && (
                    <button
                      type="button"
                      onClick={resetToCnic}
                      className="text-muted-foreground hover:text-foreground"
                      title="Reset to CNIC"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Passwords are hashed and never shown again. Share the new one
                with the employee through a secure channel.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={credMutation.isPending}
          >
            {credMutation.isPending && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            Save Credentials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function ManageLoginTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", schoolId],
    queryFn: () => fetchEmployees(schoolId),
  });

  const toggleMutation = useMutation({
    mutationFn: (emp: Employee) =>
      updateEmployeeCredentials(schoolId, emp.id, {
        login_username: emp.login_username,
        is_login_active: !emp.is_login_active,
      }),
    onSuccess: (updated, emp) => {
      qc.setQueryData<Employee[]>(["employees", schoolId], (prev) =>
        (prev ?? []).map((e) => (e.id === updated.id ? updated : e))
      );
      toast({
        title: emp.is_login_active ? "Login disabled" : "Login enabled",
        description: updated.name,
        variant: "success",
      });
    },
    onError: (e) => {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const filtered = React.useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.login_username.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  return (
    <>
      <EditCredentialsDialog
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        employee={editing}
        schoolId={schoolId}
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Header row */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-base font-medium">Manage Employee Logins</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {filtered.length}
                {search && filtered.length !== employees.length
                  ? `/${employees.length}`
                  : ""}
              </span>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
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

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
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
                  : "Add an employee first, then manage their login here."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                <AnimatePresence>
                  {filtered.map((emp) => (
                    <LoginCard
                      key={emp.id}
                      employee={emp}
                      onEdit={setEditing}
                      onToggleActive={(e) => toggleMutation.mutate(e)}
                      isToggling={
                        toggleMutation.isPending &&
                        toggleMutation.variables?.id === emp.id
                      }
                    />
                  ))}
                </AnimatePresence>
              </div>
              {search && filtered.length > 0 && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Showing {filtered.length} of {employees.length} employees
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}