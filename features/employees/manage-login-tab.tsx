"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// ── Component ─────────────────────────────────────────────────────────────────

export function ManageLoginTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editUsername, setEditUsername] = React.useState("");
  const [editPassword, setEditPassword] = React.useState("");
  const [editIsActive, setEditIsActive] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", schoolId],
    queryFn: () => fetchEmployees(schoolId),
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

  const credMutation = useMutation({
    mutationFn: (vars: { id: string; payload: CredentialsPayload }) =>
      updateEmployeeCredentials(schoolId, vars.id, vars.payload),
    onSuccess: (updated) => {
      qc.setQueryData<Employee[]>(["employees", schoolId], (prev) =>
        (prev ?? []).map((e) => (e.id === updated.id ? updated : e))
      );
      setEditingId(null);
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

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditUsername(emp.login_username);
    setEditPassword("");
    setEditIsActive(emp.is_login_active);
    setShowPassword(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPassword("");
    setShowPassword(false);
  }

  function saveCred(emp: Employee) {
    const payload: CredentialsPayload = {
      login_username: editUsername.trim() || emp.login_username,
      is_login_active: editIsActive,
    };
    if (editPassword.trim()) {
      payload.password = editPassword;
    }
    credMutation.mutate({ id: emp.id, payload });
  }

  function resetToCnic(emp: Employee) {
    const cnic = emp.cnic?.replace(/\D/g, "");
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

  function copy(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: `${label} copied`, variant: "success" }))
      .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        {/* Header row */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-medium">Manage Employee Logins</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {employees.length}
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
          <div className="space-y-3">
            {filtered.map((emp) => {
              const isEditing = editingId === emp.id;
              return (
                <motion.div
                  layout
                  key={emp.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isEditing ? "bg-primary/5 ring-1 ring-primary/30" : "bg-card"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {/* Identity */}
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        {emp.photo_url && (
                          <AvatarImage src={emp.photo_url} alt={emp.name} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {emp.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {emp.role}{" "}
                          {emp.employee_code && `· ${emp.employee_code}`}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {emp.is_login_active ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Login disabled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Credentials area */}
                    {isEditing ? (
                      <div className="flex w-full flex-col gap-3 sm:w-[420px]">
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
                              {emp.cnic && (
                                <button
                                  type="button"
                                  onClick={() => resetToCnic(emp)}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Reset to CNIC"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={editIsActive}
                            onChange={(e) => setEditIsActive(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300"
                          />
                          Login enabled
                        </label>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={credMutation.isPending}
                            onClick={() => saveCred(emp)}
                          >
                            {credMutation.isPending && (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex w-full flex-col gap-2 sm:w-[420px]">
                        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Username
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {emp.login_username}
                            </span>
                            <button
                              onClick={() =>
                                copy(emp.login_username, "Username")
                              }
                              className="text-muted-foreground hover:text-foreground"
                              title="Copy"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Password
                          </span>
                          <span className="font-mono text-sm text-muted-foreground">
                            •••••••• (CNIC)
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(emp)}
                            className="gap-1.5"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Change Credentials
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {search && filtered.length > 0 && (
              <p className="pt-2 text-center text-xs text-muted-foreground">
                Showing {filtered.length} of {employees.length} employees
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            For security, leave the password field blank to keep the existing
            password. New passwords are hashed with bcrypt and never shown
            again — share them with the employee through a secure channel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}