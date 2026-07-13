"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/toast";
import type { SchoolClass } from "@/types/school.types";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  schoolId: string;
}

const SAMPLE_CSV_HEADERS = [
  "name",
  "registration_no",
  "date_of_admission",
  "date_of_birth",
  "gender",
  "mobile",
  "discount",
  "previous_balance",
  "is_free",
  "is_orphan",
  "is_osc",
  "religion",
  "blood_group",
  "identification_mark",
  "disease",
  "birth_form_id",
  "family",
  "total_siblings",
  "address",
  "father_name",
  "father_nic",
  "father_profession",
  "additional_note",
];

const SAMPLE_ROW = [
  "Ahmed Ali",
  "0001",
  "2024-03-15",
  "2015-05-10",
  "0",
  "03335178586",
  "0",
  "500",
  "0",
  "0",
  "0",
  "Islam",
  "O+",
  "Scar on left arm",
  "",
  "BF-12345",
  "Family A",
  "2",
  "House 12, Street 5, Lahore",
  "Muhammad Ali",
  "3520212345678",
  "Businessman",
  "",
];

function downloadSampleCsv() {
  const headerLine = SAMPLE_CSV_HEADERS.join(",");
  const sampleLine = SAMPLE_ROW.map((v) =>
    v.includes(",") ? `"${v}"` : v
  ).join(",");
  const csv = `${headerLine}\n${sampleLine}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "students-sample.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ImportStudentsDialog({ open, onClose, schoolId }: ImportDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = React.useState<string>("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [result, setResult] = React.useState<{
    imported: number;
    errors: { row: number; error: string }[];
    students: { name: string; registration_no: string }[];
  } | null>(null);

  const { data: classes = [] } = useQuery<SchoolClass[]>({
    queryKey: ["classes", schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/classes/${schoolId}?limit=1000`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data?.data ?? [];
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !selectedClass) throw new Error("Select class and file");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("classId", selectedClass);
      const res = await fetch(`/api/students/${schoolId}/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      return data.data as {
        imported: number;
        errors: { row: number; error: string }[];
        students: { name: string; registration_no: string }[];
      };
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["students", schoolId] });
      toast({
        title: "Import complete",
        description: `${data.imported} student(s) imported successfully`,
        variant: "success",
      });
    },
    onError: (e) => {
      toast({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  function handleClose() {
    setSelectedClass("");
    setSelectedFile(null);
    setResult(null);
    setDragOver(false);
    onClose();
  }

  function handleFileSelect(file: File | null) {
    if (file && !file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Students
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-import students into a class.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                {result.imported} student(s) imported successfully
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {result.errors.length} row(s) failed:
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border bg-background p-2">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Row {e.row}:</span>{" "}
                        {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              {/* Class selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a class for imported students" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Download sample */}
              <button
                onClick={downloadSampleCsv}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                Download sample CSV template
              </button>

              {/* File upload dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0] ?? null;
                  handleFileSelect(file);
                }}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/30"
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Drag &amp; drop CSV here, or{" "}
                      <label className="text-primary cursor-pointer hover:underline">
                        browse
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            handleFileSelect(file);
                          }}
                        />
                      </label>
                    </p>
                  </>
                )}
              </div>

              {/* CSV column guide */}
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-semibold mb-1.5">CSV Column Guide:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                  <div><span className="font-medium text-foreground">name</span> — required</div>
                  <div><span className="font-medium text-foreground">date_of_admission</span> — YYYY-MM-DD</div>
                  <div><span className="font-medium text-foreground">date_of_birth</span> — YYYY-MM-DD</div>
                  <div><span className="font-medium text-foreground">gender</span> — 0=male, 1=female</div>
                  <div><span className="font-medium text-foreground">is_free</span> — 0=no, 1=yes</div>
                  <div><span className="font-medium text-foreground">is_orphan</span> — 0=no, 1=yes</div>
                  <div><span className="font-medium text-foreground">is_osc</span> — 0=no, 1=yes</div>
                  <div><span className="font-medium text-foreground">previous_balance</span> — number</div>
                  <div><span className="font-medium text-foreground">discount</span> — number</div>
                  <div><span className="font-medium text-foreground">religion</span> — defaults to Islam</div>
                  <div><span className="font-medium text-foreground">total_siblings</span> — integer</div>
                  <div><span className="font-medium text-foreground">registration_no</span> — number, STU- auto-added</div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={!selectedClass || !selectedFile || importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import Students
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
