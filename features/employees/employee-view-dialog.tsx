"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  Cake,
  CalendarDays,
  Coins,
  Copy,
  GraduationCap,
  Heart,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Employee } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

interface EmployeeViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
      {Icon && (
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export function EmployeeViewDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeViewDialogProps) {
  const { toast } = useToast();

  function copy(value: string, label: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => toast({ title: `${label} copied`, variant: "success" }))
      .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
  }

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
          <DialogDescription>
            Complete profile and login credentials.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
          <Avatar className="h-16 w-16">
            {employee.photo_url && (
              <AvatarImage src={employee.photo_url} alt={employee.name} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold">{employee.name}</h3>
              {employee.is_login_active ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  <UserCheck className="h-3 w-3" /> Login active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                  <Shield className="h-3 w-3" /> Login disabled
                </span>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {employee.role} {employee.employee_code && `· ${employee.employee_code}`}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Personal
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                icon={User}
                label="Full Name"
                value={employee.name}
              />
              <Field
                icon={Briefcase}
                label="Role"
                value={employee.role}
              />
              <Field
                icon={Heart}
                label="Father / Husband Name"
                value={employee.father_husband_name}
              />
              <Field
                icon={User}
                label="Gender"
                value={
                  employee.gender
                    ? employee.gender.charAt(0).toUpperCase() +
                      employee.gender.slice(1)
                    : null
                }
              />
              <Field
                icon={Shield}
                label="Religion"
                value={employee.religion}
              />
              <Field
                icon={Cake}
                label="Date of Birth"
                value={employee.date_of_birth || null}
              />
              <Field
                icon={IdCard}
                label="CNIC / ID Card"
                value={employee.cnic}
              />
              <Field
                icon={GraduationCap}
                label="Education"
                value={employee.education}
              />
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Employment
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                icon={CalendarDays}
                label="Date of Joining"
                value={employee.date_of_joining}
              />
              <Field
                icon={Briefcase}
                label="Experience"
                value={employee.experience}
              />
              <Field
                icon={Coins}
                label="Salary"
                value={
                  employee.salary != null
                    ? employee.salary.toLocaleString()
                    : null
                }
              />
              <Field
                icon={IdCard}
                label="Employee Code"
                value={employee.employee_code}
              />
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contact
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                icon={Phone}
                label="Phone"
                value={employee.phone}
              />
              <Field
                icon={Mail}
                label="Email"
                value={employee.email}
              />
              <Field
                icon={MapPin}
                label="Address"
                value={employee.address}
              />
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Login Credentials
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Username
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate font-mono text-sm font-semibold">
                      {employee.login_username}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        copy(employee.login_username, "Username")
                      }
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Default Password
                  </p>
                  <p className="mt-0.5 font-mono text-sm">
                    {employee.cnic?.replace(/\D/g, "") || "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    CNIC without dashes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}