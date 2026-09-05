"use client";

import * as React from "react";
import { X, Download, Loader2, FileText, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { attachmentDownloadUrl } from "@/lib/accounts";
import type { TransactionAttachment } from "@/types/school.types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentListProps {
  schoolId: string;
  transactionId: string;
  attachments: TransactionAttachment[];
  onDelete?: (attachmentId: string) => void;
  deletingId?: string | null;
}

export function TransactionAttachmentList({
  schoolId,
  transactionId,
  attachments,
  onDelete,
  deletingId,
}: AttachmentListProps) {
  if (!attachments.length) {
    return <p className="text-sm text-muted-foreground">No attachments.</p>;
  }

  return (
    <ul className="space-y-2">
      {attachments.map((attachment) => {
        const isImage = attachment.mime_type.startsWith("image/");
        return (
          <li
            key={attachment.id}
            className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2"
          >
            {isImage ? (
              <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(attachment.size_bytes)} ·{" "}
                {new Date(attachment.created_at).toLocaleDateString()}
              </p>
            </div>
            <a
              href={attachmentDownloadUrl(schoolId, transactionId, attachment.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
              aria-label={`Download ${attachment.file_name}`}
            >
              <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </a>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                disabled={deletingId === attachment.id}
                onClick={() => onDelete(attachment.id)}
                aria-label={`Remove ${attachment.file_name}`}
              >
                {deletingId === attachment.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface UploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export function TransactionAttachmentUploader({ files, onChange, disabled }: UploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    onChange([...files, ...Array.from(incoming)]);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <FileText className="h-4 w-4" />
        Attach receipts, bills, invoices, images or PDFs
      </button>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="h-7 w-7 text-destructive hover:text-destructive"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
