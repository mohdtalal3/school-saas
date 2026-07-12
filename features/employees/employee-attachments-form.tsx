"use client";

import * as React from "react";
import {
  Paperclip,
  Upload,
  Trash2,
  Loader2,
  FileText,
  Image,
  File,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { EmployeeAttachment } from "@/types/school.types";

interface Props {
  schoolId: string;
  employeeId: string;
  initialAttachments?: EmployeeAttachment[];
}

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export function EmployeeAttachmentsForm({
  schoolId,
  employeeId,
  initialAttachments = [],
}: Props) {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] =
    React.useState<EmployeeAttachment[]>(initialAttachments);
  const [uploading, setUploading] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState(LABEL_OPTIONS[0]);
  const [dragOver, setDragOver] = React.useState(false);

  // ── Fetch existing attachments ──────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/employees/${schoolId}/${employeeId}/attachments`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!cancelled && res.ok && json.data) {
          setAttachments(json.data);
        }
      } catch {
        // silently ignore load errors here
      }
    }
    if (employeeId) load();
    return () => {
      cancelled = true;
    };
  }, [schoolId, employeeId]);

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", selectedLabel);

      const res = await fetch(
        `/api/employees/${schoolId}/${employeeId}/attachments`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      setAttachments((prev) => [json.data, ...prev]);
      toast({ title: "File attached", description: file.name, variant: "success" });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function deleteFile(attachmentId: string) {
    try {
      const res = await fetch(
        `/api/employees/${schoolId}/${employeeId}/attachments/${attachmentId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");

      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast({ title: "File removed", variant: "success" });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Could not delete file",
        variant: "destructive",
      });
    }
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  // ── Preview dialog ─────────────────────────────────────────────────────────
  const [preview, setPreview] = React.useState<EmployeeAttachment | null>(null);

  return (
    <>
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload
            className={`mb-2 h-8 w-8 ${
              dragOver ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <p className="text-sm font-medium text-muted-foreground">
            {uploading
              ? "Uploading..."
              : "Drop a file here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, DOC, JPG, PNG — max 10 MB
          </p>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        {/* Label selector + upload button row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label className="text-xs">Document type</Label>
            <Select value={selectedLabel} onValueChange={setSelectedLabel}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="mt-5 gap-1.5"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Attach
          </Button>
        </div>

        {/* Attachment list */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Attached Documents ({attachments.length})
              </Label>
            </div>
            <div className="rounded-md border">
              {attachments.map((att, idx) => (
                <div
                  key={att.id}
                  className={`flex items-center gap-3 px-3 py-2.5 ${
                    idx !== attachments.length - 1 ? "border-b" : ""
                  }`}
                >
                  <FileIcon mimeType={att.mime_type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{att.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {att.name} · {formatBytes(att.size_bytes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Preview / Download"
                      asChild
                    >
                      <a
                        href={`/api/employees/${schoolId}/${employeeId}/attachments/${att.id}/download`}
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
                      onClick={() => deleteFile(att.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview dialog */}
      {preview && (
        <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{preview.label}</DialogTitle>
              <DialogDescription>{preview.name}</DialogDescription>
            </DialogHeader>
            {preview.mime_type.startsWith("image/") ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`/api/employees/${schoolId}/${employeeId}/attachments/${preview.id}/download`}
                alt={preview.label}
                className="mx-auto max-h-[60vh] object-contain"
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Preview not available for this file type.
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
