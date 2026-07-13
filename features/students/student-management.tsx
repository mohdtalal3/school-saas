"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
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
  Phone,
  Calendar,
  MapPin,
  UserCog,
  Coins,
  GraduationCap,
  Paperclip,
  Upload,
  Download,
  FileText,
  Image as ImageIcon,
  File as FileLucide,
  HeartPulse,
  Droplet,
  User,
  Heart,
  Cake,
  IdCard,
  Users as UsersIcon,
  Table,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Pagination } from "@/components/ui/pagination";
import { useServerPagination } from "@/lib/use-server-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchPicker } from "@/components/ui/search-picker";
import { useToast } from "@/components/ui/toast";
import { StudentForm } from "./student-form";
import { StudentDirectoryTab } from "./student-directory-tab";
import { AdmissionLetterTab } from "./admission-letter-tab";
import type { ActiveFilter } from "@/components/ui/directory-table";
import type {
  Student,
  StudentWithClass,
  SchoolClass,
  StudentAttachment,
} from "@/types/school.types";
import { getInitials } from "@/lib/utils";

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchStudents(
  schoolId: string,
  params: { page: number; limit: number; search: string; classId: string; active?: boolean | "all"; isFree?: boolean }
): Promise<{ data: StudentWithClass[]; total: number; counts?: { active: number; inactive: number; total: number } }> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.active !== undefined) qs.set("active", params.active === "all" ? "all" : String(params.active));
  if (params.search) qs.set("search", params.search);
  if (params.classId && params.classId !== "all") qs.set("classId", params.classId);
  if (params.isFree) qs.set("isFree", "true");
  const res = await fetch(`/api/students/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

async function searchStudentsForPicker(
  schoolId: string,
  query: string
): Promise<{ id: string; name: string; photo_url?: string | null; subtitle?: string }[]> {
  const qs = new URLSearchParams({ page: "1", limit: "20", search: query });
  const res = await fetch(`/api/students/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return (json.data.data as StudentWithClass[]).map((s) => ({
    id: s.id,
    name: s.name,
    photo_url: s.photo_url,
    subtitle: `${s.registration_no}${s.class_name ? ` · ${s.class_name}` : ""}`,
  }));
}

async function fetchClasses(schoolId: string): Promise<SchoolClass[]> {
  const res = await fetch(`/api/classes/${schoolId}?limit=1000`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data.data;
}

async function createStudentApi(
  schoolId: string,
  payload: Record<string, unknown>
): Promise<Student> {
  const res = await fetch(`/api/students/${schoolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to create");
  return data.data;
}

async function updateStudentApi(
  schoolId: string,
  studentId: string,
  payload: Record<string, unknown>
): Promise<Student> {
  const res = await fetch(`/api/students/${schoolId}/${studentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to update");
  return data.data;
}

async function deleteStudentApi(schoolId: string, studentId: string): Promise<void> {
  const res = await fetch(`/api/students/${schoolId}/${studentId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete");
}

// ── Student Card ───────────────────────────────────────────────────────────────

function StudentCard({
  student,
  onEdit,
  onView,
  onDelete,
}: {
  student: StudentWithClass;
  onEdit: (s: Student) => void;
  onView: (s: StudentWithClass) => void;
  onDelete: (s: Student) => void;
}) {
  const netFee = (student.class_fee ?? 0) - student.discount;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-background">
            {student.photo_url && (
              <AvatarImage src={student.photo_url} alt={student.name} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitials(student.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {student.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {student.registration_no}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(student)} title="View">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(student)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => onDelete(student)} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Class + Fee chips */}
      <div className="flex flex-wrap items-center gap-2">
        {student.class_name && (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <GraduationCap className="h-3 w-3" />
            {student.class_name}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
          <Coins className="h-3 w-3 text-muted-foreground" />
          Rs. {netFee.toLocaleString()}
        </span>
        {student.gender && (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {student.gender}
          </span>
        )}
        {student.is_free && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
            <Gift className="h-3 w-3" />
            Free
          </span>
        )}
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {student.mobile && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {student.mobile}
          </span>
        )}
        {student.father_name && (
          <span className="inline-flex items-center gap-1">
            <UserCog className="h-3 w-3" />
            {student.father_name}
          </span>
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center gap-1 border-t pt-2">
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onView(student)}>
          <Eye className="mr-1 h-3 w-3" />
          View
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onEdit(student)}>
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-destructive/70 hover:text-destructive" onClick={() => onDelete(student)}>
          <Trash2 className="mr-1 h-3 w-3" />
          Delete
        </Button>
      </div>
    </motion.div>
  );
}

// ── View Dialog ────────────────────────────────────────────────────────────────

function ViewField({
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
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

function ViewDialog({
  student,
  onClose,
}: {
  student: StudentWithClass | null;
  onClose: () => void;
}) {
  if (!student) return null;
  const netFee = (student.class_fee ?? 0) - student.discount;

  return (
    <Dialog open={!!student} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
          <DialogDescription>
            Complete student profile and admission information.
          </DialogDescription>
        </DialogHeader>

        {/* Header card */}
        <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
          <Avatar className="h-16 w-16">
            {student.photo_url && <AvatarImage src={student.photo_url} alt={student.name} />}
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(student.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold">{student.name}</h3>
            <p className="truncate text-sm text-muted-foreground">
              {student.registration_no} · {student.class_name ?? "No class"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {student.class_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <GraduationCap className="h-3 w-3" />
                  {student.class_name}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                <Coins className="h-3 w-3 text-muted-foreground" />
                Rs. {netFee.toLocaleString()}
              </span>
              {student.is_orphan && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                  Orphan
                </span>
              )}
              {student.is_osc && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                  OSC
                </span>
              )}
              {student.is_free && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  Free Education
                </span>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Admission & Fee */}
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admission &amp; Fee
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ViewField icon={FileText} label="Registration No" value={student.registration_no} />
              <ViewField icon={GraduationCap} label="Class" value={student.class_name} />
              <ViewField icon={Calendar} label="Date of Admission" value={student.date_of_admission} />
              <ViewField icon={Coins} label="Net Fee" value={`Rs. ${netFee.toLocaleString()}`} />
              <ViewField icon={Coins} label="Discount" value={student.discount > 0 ? `Rs. ${student.discount.toLocaleString()}` : null} />
              <ViewField icon={Coins} label="Previous Balance" value={student.previous_balance > 0 ? `Rs. ${student.previous_balance.toLocaleString()}` : null} />
              <ViewField icon={Phone} label="Mobile" value={student.mobile} />
            </div>
          </div>

          <Separator />

          {/* Personal */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Personal
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ViewField icon={User} label="Full Name" value={student.name} />
              <ViewField icon={Cake} label="Date of Birth" value={student.date_of_birth} />
              <ViewField icon={User} label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : null} />
              <ViewField icon={Heart} label="Religion" value={student.religion} />
              <ViewField icon={Droplet} label="Blood Group" value={student.blood_group} />
              <ViewField icon={HeartPulse} label="Disease" value={student.disease} />
              <ViewField icon={IdCard} label="Identification Mark" value={student.identification_mark} />
              <ViewField icon={FileText} label="Birth Form ID / NIC" value={student.birth_form_id} />
            </div>
          </div>

          <Separator />

          {/* Family */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Family
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ViewField icon={UsersIcon} label="Family" value={student.family} />
              <ViewField icon={UsersIcon} label="Total Siblings" value={String(student.total_siblings)} />
              <ViewField icon={UserCog} label="Father Name" value={student.father_name} />
              <ViewField icon={IdCard} label="Father NIC" value={student.father_nic} />
              <ViewField icon={UserCog} label="Father Profession" value={student.father_profession} />
              <ViewField icon={MapPin} label="Address" value={student.address} />
            </div>
          </div>

          {(student.additional_note || student.is_orphan || student.is_osc) && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Additional
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ViewField label="Orphan Student" value={student.is_orphan ? "Yes" : "No"} />
                  <ViewField label="OSC" value={student.is_osc ? "Yes" : "No"} />
                  {student.additional_note && (
                    <div className="sm:col-span-2">
                      <ViewField icon={FileText} label="Additional Note" value={student.additional_note} />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
        <Users className="h-10 w-10 text-primary" />
      </motion.div>
      <h3 className="text-lg font-semibold">No Students Yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Add your first student to start managing admissions, classes, and fees.
      </p>
      <Button onClick={onCreate} className="mt-6 gap-2">
        <Plus className="h-4 w-4" />
        Add Student
      </Button>
    </div>
  );
}

// ── Attachments Tab ────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  return <FileLucide className="h-4 w-4 text-muted-foreground" />;
}

function AttachmentsTab({ schoolId }: { schoolId: string }) {
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = React.useState<StudentWithClass | null>(null);
  const [uploadFor, setUploadFor] = React.useState<{ id: string; name: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploadLabel, setUploadLabel] = React.useState("Birth Certificate");

  const selectedId = selectedStudent?.id ?? null;

  const { data: attachments = [], refetch } = useQuery<StudentAttachment[]>({
    queryKey: ["student-attachments", selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/students/${schoolId}/${selectedId}/attachments`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    enabled: !!selectedId,
  });

  async function handleUpload(file: File) {
    if (!selectedId) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", uploadLabel);
      const res = await fetch(`/api/students/${schoolId}/${selectedId}/attachments`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast({ title: "File attached", description: file.name, variant: "success" });
      setUploadFor(null);
      refetch();
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  }

  async function deleteFile(att: StudentAttachment) {
    try {
      const res = await fetch(
        `/api/students/${schoolId}/${selectedId}/attachments/${att.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      refetch();
      toast({ title: "File removed", variant: "success" });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          Student Attachments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <SearchPicker
          placeholder="Type at least 3 letters to search students..."
          searchFn={(q) => searchStudentsForPicker(schoolId, q)}
          queryKey={(q) => ["students-search", schoolId, q] as const}
          emptyHint={{
            icon: <Paperclip className="h-7 w-7 text-muted-foreground" />,
            title: "Search for a student",
            description: "Type at least 3 letters of their name, registration number, or father's name. Then click to view and manage their documents.",
          }}
          onSelect={(item) =>
            setSelectedStudent({
              id: item.id,
              name: item.name,
              photo_url: item.photo_url ?? null,
              registration_no: item.subtitle ?? "",
              class_name: null,
            } as StudentWithClass)
          }
        />

        {/* Attachments panel */}
        {selectedStudent ? (
        <Card className="mx-auto max-w-3xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {selectedStudent.photo_url && <AvatarImage src={selectedStudent.photo_url} alt={selectedStudent.name} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(selectedStudent.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base font-medium">{selectedStudent.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.registration_no} · {selectedStudent.class_name ?? "No class"}
                  </p>
                </div>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setUploadFor({ id: selectedStudent.id, name: selectedStudent.name })}>
                <Plus className="h-3.5 w-3.5" />
                Add File
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {attachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium">No documents attached</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Attach birth certificate, CNIC, or other documents.
                </p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => setUploadFor({ id: selectedStudent.id, name: selectedStudent.name })}>
                  <Plus className="h-4 w-4" />
                  Attach Document
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                    <FileIcon mimeType={att.mime_type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{att.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {att.name} · {formatBytes(att.size_bytes)} · {new Date(att.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Download" asChild>
                        <a href={`/api/students/${schoolId}/${selectedStudent.id}/attachments/${att.id}`} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" title="Remove" onClick={() => deleteFile(att)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Upload dialog */}
      <Dialog open={!!uploadFor} onOpenChange={(o) => { if (!o) { setUploadFor(null); refetch(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Attach Document</DialogTitle>
            <DialogDescription>
              Upload a document for <span className="font-medium text-foreground">{uploadFor?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Document type</Label>
              <Select value={uploadLabel} onValueChange={setUploadLabel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Birth Certificate", "CNIC / B-Form", "Previous Result", "Migration Certificate", "Medical Certificate", "Photo", "Other"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to browse file</p>
              <p className="mt-1 text-xs text-muted-foreground">PDF, DOC, JPG, PNG — max 10 MB</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadFor(null); refetch(); }}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface StudentManagementProps {
  schoolId: string;
}

type DialogMode = "add" | "edit" | "delete";

export function StudentManagement({ schoolId }: StudentManagementProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const studentTab = searchParams.get("tab") ?? "all";

  const [mode, setMode] = React.useState<DialogMode | null>(null);
  const [selected, setSelected] = React.useState<Student | null>(null);
  const [viewStudent, setViewStudent] = React.useState<StudentWithClass | null>(null);
  const [classFilter, setClassFilter] = React.useState<string>("all");
  const [studentActiveFilter, setStudentActiveFilter] = React.useState<ActiveFilter>("active");
  const [isFreeOnly, setIsFreeOnly] = React.useState(false);
  const { page, pageSize, search, setPage, setSearch, handlePageSizeChange } = useServerPagination();

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["students", schoolId, page, pageSize, debouncedSearch, classFilter, studentActiveFilter, isFreeOnly],
    queryFn: () => fetchStudents(schoolId, {
      page,
      limit: pageSize,
      search: debouncedSearch,
      classId: classFilter,
      active: studentActiveFilter === "all" ? "all" : studentActiveFilter === "active",
      isFree: isFreeOnly || undefined,
    }),
  });
  const students = data?.data ?? [];
  const totalStudents = data?.total ?? 0;
  const counts = data?.counts;

  const { data: classes = [] } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: () => fetchClasses(schoolId),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createStudentApi(schoolId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", schoolId] });
      qc.invalidateQueries({ queryKey: ["classes", schoolId] });
      setMode(null);
      toast({ title: "Student added", variant: "success" });
    },
    onError: (e) => {
      toast({
        title: "Failed to add student",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      updateStudentApi(schoolId, selected!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", schoolId] });
      setMode(null);
      setSelected(null);
      toast({ title: "Student updated", variant: "success" });
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
    mutationFn: () => deleteStudentApi(schoolId, selected!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", schoolId] });
      qc.invalidateQueries({ queryKey: ["classes", schoolId] });
      setMode(null);
      setSelected(null);
      toast({ title: "Student removed", variant: "success" });
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
  function openAdd() { setSelected(null); setMode("add"); }
  function openEdit(s: Student) { setSelected(s); setMode("edit"); }
  function openDelete(s: Student) { setSelected(s); setMode("delete"); }
  function closeDialog() { setMode(null); setSelected(null); }

  return (
    <>
      {/* Delete dialog */}
      <Dialog open={mode === "delete"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Student?</DialogTitle>
                <DialogDescription>
                  {selected?.name} will be removed. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit dialog */}
      <Dialog open={mode === "add" || mode === "edit"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{mode === "add" ? "Add New Student" : "Edit Student"}</DialogTitle>
                <DialogDescription>
                  {mode === "add" ? "Enter the student details below." : `Editing ${selected?.name}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {mode !== null && (
            <StudentForm
              schoolId={schoolId}
              initialData={mode === "edit" ? selected : null}
              onSubmit={async (payload) => {
                if (mode === "add") return createMutation.mutateAsync(payload);
                return updateMutation.mutateAsync(payload);
              }}
              onSuccess={() => { setMode(null); setSelected(null); }}
              submitLabel={mode === "add" ? "Add Student" : "Update Student"}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <ViewDialog student={viewStudent} onClose={() => setViewStudent(null)} />

      {/* Page content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
            <p className="text-sm text-muted-foreground">
              Manage student admissions, classes, and fees.
            </p>
          </div>
          {studentTab === "all" && (
            <Button onClick={openAdd} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          )}
        </div>

        {/* Filter bar — shared for all/list tabs */}
        {(studentTab === "all" || studentTab === "list") && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
              {(["active", "inactive", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setStudentActiveFilter(f); setPage(1); }}
                  className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    studentActiveFilter === f
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => { setIsFreeOnly((v) => !v); setPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isFreeOnly
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Gift className="h-3.5 w-3.5" />
              Free Only
            </button>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, reg no, father..."
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

        {/* All Students tab */}
        {studentTab === "all" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Student Directory
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
              ) : students.length === 0 ? (
                <EmptyState onCreate={openAdd} />
              ) : (
                <>
                  {students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No students match your filters.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearch(""); setClassFilter("all"); }}>
                        Clear filters
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        <AnimatePresence>
                          {students.map((s) => (
                            <StudentCard
                              key={s.id}
                              student={s}
                              onEdit={openEdit}
                              onView={setViewStudent}
                              onDelete={openDelete}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="mt-4">
                        <Pagination
                          page={page}
                          pageSize={pageSize}
                          total={totalStudents}
                          onPageChange={setPage}
                          onPageSizeChange={handlePageSizeChange}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Basic List tab */}
        {studentTab === "list" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Table className="h-4 w-4 text-muted-foreground" />
                Student List
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {totalStudents}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StudentDirectoryTab
                schoolId={schoolId}
                controlledSearch={search}
                controlledSetSearch={setSearch}
                controlledActiveFilter={studentActiveFilter}
                controlledSetActiveFilter={setStudentActiveFilter}
                controlledClassId={classFilter}
                controlledSetClassId={setClassFilter}
                controlledIsFree={isFreeOnly || undefined}
                hideFilterBar
              />
            </CardContent>
          </Card>
        )}

        {/* Admission Letter tab */}
        {studentTab === "admission" && (
          <AdmissionLetterTab schoolId={schoolId} />
        )}

        {/* Attachments tab */}
        {studentTab === "attachments" && (
          <AttachmentsTab schoolId={schoolId} />
        )}
      </motion.div>
    </>
  );
}
