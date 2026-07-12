"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Paperclip,
  Search,
  Loader2,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Users,
  Plus,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/components/ui/toast";
import type { Employee, EmployeeAttachment } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf")
    return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.startsWith("image/"))
    return <Image className="h-4 w-4 text-blue-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

// ── Upload dialog ────────────────────────────────────────────────────────────────

function UploadDialog({
  open,
  onOpenChange,
  schoolId,
  employeeId,
  employeeName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schoolId: string;
  employeeId: string;
  employeeName: string;
}) {
  const { toast } = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [label, setLabel] = React.useState("CV / Resume");

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", label);
      const res = await fetch(
        `/api/employees/${schoolId}/${employeeId}/attachments`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast({ title: "File attached", description: file.name, variant: "success" });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Document</DialogTitle>
          <DialogDescription>
            Upload a document for{" "}
            <span className="font-medium text-foreground">{employeeName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Document type</Label>
            <Select value={label} onValueChange={setLabel}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "CV / Resume",
                  "Matric Certificate",
                  "Intermediate Certificate",
                  "Bachelor Certificate",
                  "Master Certificate",
                  "M.Phil / PhD Certificate",
                  "Experience Letter",
                  "NOC",
                  "Domicile",
                  "CNIC Copy",
                  "Medical Certificate",
                  "Other",
                ].map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
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
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOC, JPG, PNG — max 10 MB
            </p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main tab ───────────────────────────────────────────────────────────────────

const LABEL_OPTIONS = [
  "CV / Resume",
  "Matric Certificate",
  "Intermediate Certificate",
  "Bachelor Certificate",
  "Master Certificate",
  "M.Phil / PhD Certificate",
  "Experience Letter",
  "NOC",
  "Domicile",
  "CNIC Copy",
  "Medical Certificate",
  "Other",
];

interface Props {
  schoolId: string;
}

export function AttachmentsTab({ schoolId }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [uploadFor, setUploadFor] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  // All employees
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees", schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${schoolId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
  });

  // Attachments for selected employee
  const { data: attachments = [], refetch } = useQuery<EmployeeAttachment[]>({
    queryKey: ["employee-attachments", selectedId],
    queryFn: async () => {
      const res = await fetch(
        `/api/employees/${schoolId}/${selectedId}/attachments`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    enabled: !!selectedId,
  });

  const selectedEmployee = employees.find((e) => e.id === selectedId);

  async function deleteFile(att: EmployeeAttachment) {
    try {
      const res = await fetch(
        `/api/employees/${schoolId}/${selectedId}/attachments/${att.id}`,
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

  const filtered = employees.filter(
    (e) =>
      !search.trim() ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Left: employee list */}
      <div className="lg:col-span-1">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              Employees
            </CardTitle>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[60vh] space-y-1 overflow-y-auto p-0 pb-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {search ? "No employees found" : "No employees yet"}
              </p>
            ) : (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedId(emp.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                    selectedId === emp.id ? "bg-primary/5" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    {emp.photo_url && (
                      <AvatarImage src={emp.photo_url} alt={emp.name} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(emp.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{emp.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {emp.role}
                    </p>
                  </div>
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: attachments panel */}
      <div className="lg:col-span-2">
        {selectedEmployee ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {selectedEmployee.photo_url && (
                      <AvatarImage
                        src={selectedEmployee.photo_url}
                        alt={selectedEmployee.name}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(selectedEmployee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base font-medium">
                      {selectedEmployee.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.role} &middot; {selectedEmployee.employee_code}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    setUploadFor({ id: selectedEmployee.id, name: selectedEmployee.name })
                  }
                >
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
                    Attach CV, certificates, or other documents for this employee.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 gap-2"
                    onClick={() =>
                      setUploadFor({
                        id: selectedEmployee.id,
                        name: selectedEmployee.name,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Attach Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 rounded-lg border px-4 py-3"
                    >
                      <FileIcon mimeType={att.mime_type} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{att.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.name} · {formatBytes(att.size_bytes)} ·{" "}
                          {new Date(att.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Download"
                          asChild
                        >
                          <a
                            href={`/api/employees/${schoolId}/${selectedEmployee.id}/attachments/${att.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive"
                          title="Remove"
                          onClick={() => deleteFile(att)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex h-full min-h-48 flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">Select an employee</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose an employee from the list to view and manage their documents.
            </p>
          </Card>
        )}
      </div>

      {/* Upload dialog */}
      {uploadFor && (
        <UploadDialog
          open={!!uploadFor}
          onOpenChange={(o) => {
            if (!o) {
              setUploadFor(null);
              refetch();
            }
          }}
          schoolId={schoolId}
          employeeId={uploadFor.id}
          employeeName={uploadFor.name}
        />
      )}
    </div>
  );
}
