"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  User,
  Coins,
  Users,
  GraduationCap,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Pagination } from "@/components/ui/pagination";
import { useServerPagination } from "@/lib/use-server-pagination";
import { ClassForm } from "./class-form";
import type { SchoolClass, ClassWithStats } from "@/types/school.types";

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchClasses(
  schoolId: string,
  params: { page: number; limit: number; search: string }
): Promise<{ data: ClassWithStats[]; total: number }> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) qs.set("search", params.search);
  const res = await fetch(`/api/classes/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

async function createClassApi(
  schoolId: string,
  payload: { name: string; fee: number; class_teacher: string | null; capacity: number }
): Promise<SchoolClass> {
  const res = await fetch(`/api/classes/${schoolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to create");
  return data.data;
}

async function updateClassApi(
  schoolId: string,
  classId: string,
  payload: Partial<SchoolClass>
): Promise<SchoolClass> {
  const res = await fetch(`/api/classes/${schoolId}/${classId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to update");
  return data.data;
}

async function deleteClassApi(schoolId: string, classId: string): Promise<void> {
  const res = await fetch(`/api/classes/${schoolId}/${classId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete");
}

// ── Class Card ─────────────────────────────────────────────────────────────────

function ClassCard({
  cls,
  onEdit,
  onDelete,
}: {
  cls: ClassWithStats;
  onEdit: (c: SchoolClass) => void;
  onDelete: (c: SchoolClass) => void;
}) {
  const total = cls.boys + cls.girls;
  const pct = cls.capacity > 0 ? Math.min((total / cls.capacity) * 100, 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
    >
      {/* Top: icon + name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {cls.name}
            </p>
            {cls.class_teacher && (
              <p className="truncate text-xs text-muted-foreground">
                Teacher: {cls.class_teacher}
              </p>
            )}
          </div>
        </div>

        {/* Hover-revealed actions */}
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(cls)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive/70 hover:text-destructive"
            onClick={() => onDelete(cls)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Fee chip */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
          <Coins className="h-3 w-3 text-muted-foreground" />
          Rs. {cls.fee.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3 w-3" />
          Cap: {cls.capacity}
        </span>
      </div>

      {/* Boys / Girls counts */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-blue-600">
            Boys
          </p>
          <p className="text-lg font-bold text-blue-700">{cls.boys}</p>
        </div>
        <div className="rounded-lg border border-pink-200 bg-pink-50 p-2.5 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-pink-600">
            Girls
          </p>
          <p className="text-lg font-bold text-pink-700">{cls.girls}</p>
        </div>
      </div>

      {/* Progress bar — enrollment vs capacity */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Enrollment</span>
          <span>
            {total} / {cls.capacity}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full rounded-full ${
              pct >= 90
                ? "bg-destructive"
                : pct >= 70
                  ? "bg-amber-500"
                  : "bg-primary"
            }`}
          />
        </div>
      </div>

      {/* Footer: action buttons */}
      <div className="mt-auto flex items-center gap-1 border-t pt-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onEdit(cls)}
        >
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs text-destructive/70 hover:text-destructive"
          onClick={() => onDelete(cls)}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Delete
        </Button>
      </div>
    </motion.div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
      >
        <GraduationCap className="h-10 w-10 text-primary" />
      </motion.div>
      <h3 className="text-lg font-semibold">No Classes Yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create your first class to start managing students, sections, and fees.
      </p>
      <Button onClick={onCreate} className="mt-6 gap-2">
        <Plus className="h-4 w-4" />
        Create Class
      </Button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface ClassManagementProps {
  schoolId: string;
}

type DialogMode = "add" | "edit" | "delete";

export function ClassManagement({ schoolId }: ClassManagementProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [mode, setMode] = React.useState<DialogMode | null>(null);
  const [selected, setSelected] = React.useState<SchoolClass | null>(null);
  const { page, pageSize, search, setPage, setSearch, handlePageSizeChange } = useServerPagination();

  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["classes", schoolId, page, pageSize, debouncedSearch],
    queryFn: () => fetchClasses(schoolId, { page, limit: pageSize, search: debouncedSearch }),
  });
  const classes = data?.data ?? [];
  const totalClasses = data?.total ?? 0;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createClassApi>[1]) =>
      createClassApi(schoolId, payload),
    onSuccess: (created) => {
      qc.setQueryData<ClassWithStats[]>(["classes", schoolId], (prev) =>
        [...(prev ?? []), { ...created, boys: 0, girls: 0, total_students: 0 }].sort(
          (a, b) => a.name.localeCompare(b.name)
        )
      );
      setMode(null);
      toast({ title: "Class created", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Failed to create class",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<SchoolClass>) =>
      updateClassApi(schoolId, selected!.id, payload),
    onSuccess: (updated) => {
      qc.setQueryData<ClassWithStats[]>(["classes", schoolId], (prev) =>
        (prev ?? [])
          .map((c) =>
            c.id === updated.id
              ? { ...updated, boys: c.boys, girls: c.girls, total_students: c.total_students }
              : c
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setMode(null);
      setSelected(null);
      toast({ title: "Class updated", variant: "success" });
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
    mutationFn: () => deleteClassApi(schoolId, selected!.id),
    onSuccess: () => {
      qc.setQueryData<ClassWithStats[]>(["classes", schoolId], (prev) =>
        (prev ?? []).filter((c) => c.id !== selected!.id)
      );
      setMode(null);
      setSelected(null);
      toast({ title: "Class removed", variant: "success" });
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

  function openEdit(c: SchoolClass) {
    setSelected(c);
    setMode("edit");
  }

  function openDelete(c: SchoolClass) {
    setSelected(c);
    setMode("delete");
  }

  function closeDialog() {
    setMode(null);
    setSelected(null);
  }

  return (
    <>
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
                <DialogTitle>Delete Class?</DialogTitle>
                <DialogDescription>
                  {selected?.name} will be removed. This action cannot be undone.
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
              Delete
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>
                  {mode === "add" ? "Create New Class" : "Edit Class"}
                </DialogTitle>
                <DialogDescription>
                  {mode === "add"
                    ? "Enter the class details below."
                    : `Editing ${selected?.name}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {mode !== null && (
            <ClassForm
              schoolId={schoolId}
              initialData={mode === "edit" ? selected : null}
              onSubmit={async (payload) => {
                if (mode === "add") {
                  return createMutation.mutateAsync(payload);
                } else {
                  return updateMutation.mutateAsync(payload);
                }
              }}
              onSuccess={() => {
                setMode(null);
                setSelected(null);
              }}
              submitLabel={mode === "add" ? "Create Class" : "Update Class"}
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
            <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
            <p className="text-sm text-muted-foreground">
              Manage your school&apos;s classes, fees, and teachers.
            </p>
          </div>
          {classes.length > 0 && (
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState onCreate={openAdd} />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {classes.length} {classes.length === 1 ? "class" : "classes"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {classes.filter((c) => c.class_teacher).length} with teacher
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by class name or teacher..."
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Class Directory
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {totalClasses}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <>
                {/* Card grid */}
                {classes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No classes match "{search}".
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setSearch("")}
                    >
                      Clear search
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      <AnimatePresence>
                        {classes.map((cls) => (
                          <ClassCard
                            key={cls.id}
                            cls={cls}
                            onEdit={openEdit}
                            onDelete={openDelete}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="mt-4">
                      <Pagination
                        page={page}
                        pageSize={pageSize}
                        total={totalClasses}
                        onPageChange={setPage}
                        onPageSizeChange={handlePageSizeChange}
                      />
                    </div>
                  </>
                )}
              </>
            </CardContent>
          </Card>
          </>
        )}
      </motion.div>
    </>
  );
}
