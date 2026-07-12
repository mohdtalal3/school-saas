"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Paperclip,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { SearchPicker } from "@/components/ui/search-picker";
import { useToast } from "@/components/ui/toast";
import type { Employee, EmployeeAttachment } from "@/types/school.types";
import { getInitials } from "@/lib/utils";

async function searchEmployees(
  schoolId: string,
  query: string
): Promise<{ id: string; name: string; photo_url?: string | null; subtitle?: string }[]> {
  const qs = new URLSearchParams({ page: "1", limit: "20", search: query });
  const res = await fetch(`/api/employees/${schoolId}?${qs}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return (json.data.data as Employee[]).map((e) => ({
    id: e.id,
    name: e.name,
    photo_url: e.photo_url,
    subtitle: `${e.role}${e.employee_code ? ` · ${e.employee_code}` : ""}`,
  }));
}

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

// ── Upload dialog───────────────────────────────────────────────────────────────

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
  const [label, setLabel] = React.useState("CV / Resume");

  async function handleUpload(file: File) {
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
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [uploadFor, setUploadFor] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const selectedId = selectedEmployee?.id ?? null;

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

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          Employee Attachments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <SearchPicker
          placeholder="Type at least 3 letters to search employees..."
          searchFn={(q) => searchEmployees(schoolId, q)}
          queryKey={(q) => ["employees-search", schoolId, q] as const}
          emptyHint={{
            icon: <Paperclip className="h-7 w-7 text-muted-foreground" />,
            title: "Search for an employee",
            description: "Type at least 3 letters of their name, role, or code. Then click to view and manage their documents.",
          }}
          onSelect={(item) =>
            setSelectedEmployee({
              id: item.id,
              name: item.name,
              photo_url: item.photo_url ?? null,
            } as Employee)
          }
        />

        {/* Attachments panel */}
        {selectedEmployee ? (
        <Card className="mx-auto max-w-3xl">
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
      ) : null}

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

      </CardContent>
    </Card>
  );
}
