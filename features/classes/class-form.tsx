"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BookOpen, Coins, Users, Search, Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import type { SchoolClass, Employee } from "@/types/school.types";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Class name is required"),
  fee: z.string().min(1, "Fee is required"),
  annual_dues: z.string().optional(),
  class_teacher: z.string().optional(),
  capacity: z.string().optional(),
});

export type ClassFormValues = z.infer<typeof schema>;

interface ClassFormProps {
  schoolId: string;
  initialData?: SchoolClass | null;
  onSubmit: (values: {
    name: string;
    fee: number;
    annual_dues: number;
    class_teacher: string | null;
    capacity: number;
  }) => Promise<SchoolClass>;
  onSuccess?: (result: SchoolClass) => void;
  submitLabel?: string;
}

async function fetchEmployees(schoolId: string): Promise<Employee[]> {
  const res = await fetch(`/api/employees/${schoolId}?limit=1000`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data.data;
}

export function ClassForm({
  schoolId,
  initialData,
  onSubmit,
  onSuccess,
  submitLabel = "Save Class",
}: ClassFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);

  // Combobox state for teacher search
  const [teacherOpen, setTeacherOpen] = React.useState(false);
  const [teacherSearch, setTeacherSearch] = React.useState("");
  const teacherRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees", schoolId],
    queryFn: () => fetchEmployees(schoolId),
  });

  // Filter employees by search term
  const filteredEmployees = React.useMemo(() => {
    if (!teacherSearch.trim()) return employees;
    const q = teacherSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.role && e.role.toLowerCase().includes(q))
    );
  }, [employees, teacherSearch]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (teacherRef.current && !teacherRef.current.contains(e.target as Node)) {
        setTeacherOpen(false);
        setTeacherSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (teacherOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    } else {
      setTeacherSearch("");
    }
  }, [teacherOpen]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          fee: String(initialData.fee),
          annual_dues: String(initialData.annual_dues ?? 0),
          class_teacher: initialData.class_teacher ?? "",
          capacity: String(initialData.capacity),
        }
      : {
          name: "",
          fee: "",
          annual_dues: "0",
          class_teacher: "",
          capacity: "50",
        },
  });

  async function handleValidSubmit(v: ClassFormValues) {
    setSubmitting(true);
    try {
      const payload = {
        name: v.name,
        fee: Number(v.fee) || 0,
        annual_dues: Number(v.annual_dues) || 0,
        class_teacher: v.class_teacher || null,
        capacity: Number(v.capacity) || 50,
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
    <form onSubmit={handleSubmit(handleValidSubmit)} className="space-y-5">
      {/* Class Name */}
      <div className="space-y-1.5">
        <Label htmlFor="class_name">
          Class Name <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="class_name"
            placeholder="e.g. Class 1, Grade 5, Montessori"
            className="pl-9"
            {...register("name")}
          />
        </div>
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Fee + Annual Dues + Capacity */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="class_fee">
            Monthly Fee <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="class_fee"
              type="number"
              step="0.01"
              placeholder="5000"
              className="pl-9"
              {...register("fee")}
            />
          </div>
          {errors.fee && (
            <p className="text-xs text-destructive">{errors.fee.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="class_annual_dues">Annual Dues</Label>
          <div className="relative">
            <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="class_annual_dues"
              type="number"
              step="0.01"
              placeholder="0"
              className="pl-9"
              {...register("annual_dues")}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Annual charges per student (e.g. fund).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="class_capacity">Capacity</Label>
          <div className="relative">
            <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="class_capacity"
              type="number"
              placeholder="50"
              className="pl-9"
              {...register("capacity")}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Max students for progress bar calculation.
          </p>
        </div>
      </div>

      {/* Class Teacher — searchable combobox loaded from employees */}
      <div className="space-y-1.5">
        <Label>Class Teacher</Label>
        <div className="relative" ref={teacherRef}>
          {/* Trigger button */}
          <button
            type="button"
            onClick={() => setTeacherOpen((v) => !v)}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background transition-colors hover:bg-accent/50",
              !watch("class_teacher") && "text-muted-foreground"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              {employeesLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading...
                </>
              ) : watch("class_teacher") ? (
                <span className="truncate">{watch("class_teacher")}</span>
              ) : (
                "Select a teacher"
              )}
            </span>
            <span className="flex items-center gap-1">
              {watch("class_teacher") && (
                <X
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setValue("class_teacher", "", { shouldDirty: true });
                  }}
                />
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          </button>

          {/* Dropdown panel */}
          {teacherOpen && (
            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
              {/* Search input */}
              <div className="relative border-b p-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Search teacher by name or role..."
                  className="h-8 w-full rounded-sm bg-transparent pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filteredEmployees.length > 0) {
                      e.preventDefault();
                      setValue("class_teacher", filteredEmployees[0].name, {
                        shouldDirty: true,
                      });
                      setTeacherOpen(false);
                    }
                    if (e.key === "Escape") {
                      setTeacherOpen(false);
                    }
                  }}
                />
              </div>

              {/* Options list */}
              <div className="max-h-48 overflow-y-auto scrollbar-thin">
                {/* Clear option */}
                <button
                  type="button"
                  onClick={() => {
                    setValue("class_teacher", "", { shouldDirty: true });
                    setTeacherOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
                >
                  — No teacher —
                </button>

                {filteredEmployees.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {employees.length === 0
                      ? "No employees found. Add employees first."
                      : "No matching teacher found."}
                  </p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const selected = watch("class_teacher") === emp.name;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setValue("class_teacher", emp.name, {
                            shouldDirty: true,
                          });
                          setTeacherOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent",
                          selected && "bg-accent/60"
                        )}
                      >
                        <span className="truncate">
                          {emp.name}
                          {emp.role && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              — {emp.role}
                            </span>
                          )}
                        </span>
                        {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        {employees.length === 0 && !employeesLoading && (
          <p className="text-[10px] text-muted-foreground">
            No employees found. Add employees first to assign a class teacher.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
