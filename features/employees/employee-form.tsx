"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Upload,
  ImageIcon,
  User,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Coins,
  Briefcase,
  GraduationCap,
  IdCard,
  Heart,
  Cake,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { Employee } from "@/types/school.types";
import { EmployeeAttachmentsForm } from "./employee-attachments-form";

const RELIGIONS = [
  "Islam",
  "Christianity",
  "Hinduism",
  "Sikhism",
  "Buddhism",
  "Judaism",
  "Other",
];

const ROLE_OPTIONS = [
  "Principal",
  "Vice Principal",
  "Teacher",
  "Accountant",
  "Librarian",
  "Lab Assistant",
  "Computer Operator",
  "Receptionist",
  "Admin Officer",
  "Office Boy",
  "Peon",
  "Security Guard",
  "Driver",
  "Sweeper",
  "Gardener",
  "Ayah",
  "Helper",
  "Clerk",
  "Cashier",
  "Nurse",
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  role: z.string().min(1, "Role is required"),
  father_husband_name: z.string().optional(),
  gender: z.string().optional(),
  religion: z.string().optional(),
  cnic: z.string().min(5, "CNIC is required"),
  date_of_birth: z.string().optional(),
  date_of_joining: z.string().min(1, "Date of joining is required"),
  salary: z.string().optional(),
  experience: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  education: z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof schema>;

interface CreateResult {
  employee: Employee;
  username: string;
  password: string;
}

interface EmployeeFormProps {
  schoolId: string;
  initialData?: Employee | null;
  /** Used as employee id when uploading a photo for an existing record. */
  currentEmployeeId?: string;
  onSubmit: (
    values: {
      name: string;
      role: string;
      father_husband_name: string | null;
      gender: "male" | "female" | "other" | null;
      religion: string | null;
      cnic: string;
      date_of_birth: string | null;
      date_of_joining: string;
      salary: number | null;
      experience: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      education: string | null;
    }
  ) => Promise<Employee | CreateResult>;
  onSuccess?: (result: Employee | CreateResult) => void;
  submitLabel?: string;
}

export function EmployeeForm({
  schoolId,
  initialData,
  currentEmployeeId,
  onSubmit,
  onSuccess,
  submitLabel = "Save Employee",
}: EmployeeFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(
    initialData?.photo_url ?? null
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          role: initialData.role,
          father_husband_name: initialData.father_husband_name ?? "",
          gender: initialData.gender ?? "",
          religion: initialData.religion ?? "",
          cnic: initialData.cnic ?? "",
          date_of_birth: initialData.date_of_birth ?? "",
          date_of_joining: initialData.date_of_joining,
          salary: initialData.salary != null ? String(initialData.salary) : "",
          experience: initialData.experience ?? "",
          phone: initialData.phone ?? "",
          email: initialData.email ?? "",
          address: initialData.address ?? "",
          education: initialData.education ?? "",
        }
      : {
          name: "",
          role: "",
          father_husband_name: "",
          gender: "",
          religion: "",
          cnic: "",
          date_of_birth: "",
          date_of_joining: new Date().toISOString().slice(0, 10),
          salary: "",
          experience: "",
          phone: "",
          email: "",
          address: "",
          education: "",
        },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        role: initialData.role,
        father_husband_name: initialData.father_husband_name ?? "",
        gender: initialData.gender ?? "",
        religion: initialData.religion ?? "",
        cnic: initialData.cnic ?? "",
        date_of_birth: initialData.date_of_birth ?? "",
        date_of_joining: initialData.date_of_joining,
        salary: initialData.salary != null ? String(initialData.salary) : "",
        experience: initialData.experience ?? "",
        phone: initialData.phone ?? "",
        email: initialData.email ?? "",
        address: initialData.address ?? "",
        education: initialData.education ?? "",
      });
      setPhotoUrl(initialData.photo_url ?? null);
    }
  }, [initialData, reset]);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!currentEmployeeId) {
      toast({
        title: "Save the employee first",
        description: "Photo can be uploaded after the employee record is saved.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/employees/${schoolId}/${currentEmployeeId}/photo`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");
      setPhotoUrl(json.data.photo_url);
      toast({ title: "Photo updated", variant: "success" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  }

  async function handleValidSubmit(v: EmployeeFormValues) {
    setSubmitting(true);
    try {
      const payload = {
        name: v.name,
        role: v.role,
        father_husband_name: v.father_husband_name || null,
        gender: (v.gender || null) as "male" | "female" | "other" | null,
        religion: v.religion || null,
        cnic: v.cnic,
        date_of_birth: v.date_of_birth || null,
        date_of_joining: v.date_of_joining,
        salary: v.salary ? Number(v.salary) : null,
        experience: v.experience || null,
        phone: v.phone || null,
        email: v.email || null,
        address: v.address || null,
        education: v.education || null,
      };
      const result = await onSubmit(payload);
      onSuccess?.(result);
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="space-y-6">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted/40">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Employee photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <Label className="block text-sm">Profile Photo</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            JPG or PNG. Max 500KB.
          </p>
          <label className="inline-block">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={onPhotoChange}
            />
            <span className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
              {photoUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {photoUploading ? "Uploading..." : "Upload Photo"}
            </span>
          </label>
        </div>
      </div>

      {/* Name + Role */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              placeholder="Muhammad Ahmed"
              className="pl-9"
              {...register("name")}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">
            Role / Designation <span className="text-destructive">*</span>
          </Label>
          <Select
            value={
              (ROLE_OPTIONS as readonly string[]).includes(watch("role") ?? "")
                ? watch("role")
                : watch("role")
                  ? "__custom__"
                  : ""
            }
            onValueChange={(v) => {
              if (v === "__custom__") {
                setValue("role", "", { shouldDirty: true, shouldValidate: true });
              } else {
                setValue("role", v, { shouldDirty: true, shouldValidate: true });
              }
            }}
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">Other (type custom)...</SelectItem>
            </SelectContent>
          </Select>
          {(ROLE_OPTIONS as readonly string[]).includes(watch("role") ?? "") === false && (
            <div className="relative mt-2">
              <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Type custom role"
                className="pl-9"
                value={watch("role") ?? ""}
                onChange={(e) =>
                  setValue("role", e.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </div>
          )}
          {errors.role && (
            <p className="text-xs text-destructive">{errors.role.message}</p>
          )}
        </div>
      </div>

      {/* Father / Husband + Gender + Religion */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="father_husband_name">Father / Husband Name</Label>
          <div className="relative">
            <Heart className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="father_husband_name"
              placeholder="Father's name"
              className="pl-9"
              {...register("father_husband_name")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select
            value={watch("gender") || ""}
            onValueChange={(v) => setValue("gender", v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Religion</Label>
          <Select
            value={watch("religion") || ""}
            onValueChange={(v) => setValue("religion", v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select religion" />
            </SelectTrigger>
            <SelectContent>
              {RELIGIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CNIC + DOB + Date of Joining */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="cnic">
            CNIC / ID Card <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cnic"
              placeholder="00000-0000000-0"
              className="pl-9"
              {...register("cnic")}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Used as login username &amp; default password (digits only).
          </p>
          {errors.cnic && (
            <p className="text-xs text-destructive">{errors.cnic.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <div className="relative">
            <Cake className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="date_of_birth"
              type="date"
              className="pl-9"
              {...register("date_of_birth")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date_of_joining">
            Date of Joining <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="date_of_joining"
              type="date"
              className="pl-9"
              {...register("date_of_joining")}
            />
          </div>
          {errors.date_of_joining && (
            <p className="text-xs text-destructive">
              {errors.date_of_joining.message}
            </p>
          )}
        </div>
      </div>

      {/* Salary + Experience */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="salary">Salary</Label>
          <div className="relative">
            <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="salary"
              type="number"
              step="0.01"
              placeholder="50000"
              className="pl-9"
              {...register("salary")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="experience">Experience</Label>
          <Input
            id="experience"
            placeholder="e.g. 5 years"
            {...register("experience")}
          />
        </div>
      </div>

      {/* Phone + Email */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              placeholder="03001234567"
              className="pl-9"
              {...register("phone")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="employee@school.com"
              className="pl-9"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      {/* Education */}
      <div className="space-y-1.5">
        <Label htmlFor="education">Education</Label>
        <div className="relative">
          <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="education"
            placeholder="e.g. B.Ed, M.A. English"
            className="pl-9"
            {...register("education")}
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Home Address</Label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            id="address"
            rows={2}
            placeholder="House #, Street, City"
            className="pl-9"
            {...register("address")}
          />
        </div>
      </div>

      {/* Attachments (CV, certificates, etc.) — only when employee is saved */}
      {currentEmployeeId && (
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Paperclip className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Attachments</p>
              <p className="text-xs text-muted-foreground">
                Attach CV, certificates, experience letters and other documents.
              </p>
            </div>
          </div>
          <EmployeeAttachmentsForm
            schoolId={schoolId}
            employeeId={currentEmployeeId}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}