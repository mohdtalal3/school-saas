"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Loader2, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchPicker } from "@/components/ui/search-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { EmployeeAttendanceStatusBadge } from "./employee-attendance-status-badge";
import { employeeAttendanceRequest, jsonRequest } from "./api";

type Preview = {
  total_rows: number;
  valid: Array<{ employee_id: string; employee_code: string; employee_name: string; actual_check_in: string | null; actual_check_out: string | null; status: "present" | "late" | "absent" | "leave" | "short_leave" | "half_day"; late_minutes: number; early_leave_minutes: number; existing: boolean }>;
  invalid: Array<{ row: number; message: string }>;
  unmatched: Array<{ row: number; biometric_id: string; employee_code: string; employee_name: string }>;
  skipped: Array<{ source_rows: number[]; reason: string }>;
};

export function AttendanceImportModal({ schoolId, date, open, onOpenChange, onImported }: { schoolId: string; date: string; open: boolean; onOpenChange: (open: boolean) => void; onImported: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [strategy, setStrategy] = React.useState("merge_missing");
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(mode: "preview" | "import") {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("date", date);
      form.set("strategy", strategy);
      form.set("mode", mode);
      const response = await fetch(`/api/attendance/${schoolId}/employees/import`, { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Import failed");
      if (mode === "preview") setPreview(payload.data as Preview);
      else {
        toast({ title: "Attendance imported", description: `${payload.data.imported} employee record(s) saved.`, variant: "success" });
        onImported();
        onOpenChange(false);
      }
    } catch (error) {
      toast({ title: mode === "preview" ? "Could not preview file" : "Import failed", description: error instanceof Error ? error.message : "Try again", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function searchEmployees(search: string) {
    const result = await employeeAttendanceRequest<{ data: Array<{ id: string; name: string; employee_code: string | null; role: string }> }>(`/api/employees/${schoolId}?limit=10&active=true&search=${encodeURIComponent(search)}`);
    return result.data.map((employee) => ({ id: employee.id, name: employee.name, subtitle: `${employee.employee_code ?? "No ID"} · ${employee.role}` }));
  }

  async function mapEmployee(identifier: string, employeeId: string) {
    try {
      await employeeAttendanceRequest(`/api/attendance/${schoolId}/employees/mappings`, jsonRequest("POST", { biometric_id: identifier, employee_id: employeeId }));
      toast({ title: "Biometric employee mapping saved", variant: "success" });
      await submit("preview");
    } catch (error) {
      toast({ title: "Could not save mapping", description: error instanceof Error ? error.message : "Try again", variant: "destructive" });
    }
  }

  React.useEffect(() => { if (!open) { setPreview(null); setFile(null); } }, [open]);

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
    <DialogHeader><DialogTitle>Import biometric attendance</DialogTitle><DialogDescription>CSV and Excel files are validated on the server. Multiple punches are combined using the earliest check-in and latest check-out.</DialogDescription></DialogHeader>
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><p className="font-semibold">ZKTeco-compatible import design</p><p className="mt-1 text-xs">Use Employee ID, Biometric ID, Employee Name, Attendance Date, Check-in Time and Check-out Time. Punch Time rows are also supported.</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5"><Label>Selected date</Label><Input type="date" value={date} disabled /></div>
        <div className="space-y-1.5"><Label>Existing records</Label><Select value={strategy} onValueChange={(value) => { setStrategy(value); setPreview(null); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="merge_missing">Merge missing times (Safe)</SelectItem><SelectItem value="skip">Skip existing</SelectItem><SelectItem value="replace">Replace existing</SelectItem></SelectContent></Select></div>
        <div className="flex items-end"><Button type="button" variant="outline" asChild className="w-full"><a href={`/api/attendance/${schoolId}/employees/import/sample`}><Download className="mr-2 h-4 w-4" />Download Sample</a></Button></div>
      </div>
      <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center hover:bg-muted/30"><FileSpreadsheet className="mb-3 h-9 w-9 text-primary" /><span className="font-medium">{file?.name ?? "Choose CSV or Excel file"}</span><span className="mt-1 text-xs text-muted-foreground">Maximum 10 MB</span><input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} /></label>
      {preview && <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4"><Stat label="File rows" value={preview.total_rows} /><Stat label="Valid employees" value={preview.valid.length} /><Stat label="Invalid rows" value={preview.invalid.length} /><Stat label="Unmatched rows" value={preview.unmatched.length} /></div>
        {preview.valid.length > 0 && <div className="max-h-72 overflow-auto rounded-lg border"><table className="w-full min-w-[720px] text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-2 text-left">Employee</th><th className="p-2 text-left">Check-in</th><th className="p-2 text-left">Check-out</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Late</th><th className="p-2 text-left">Early</th></tr></thead><tbody>{preview.valid.map((row) => <tr key={row.employee_id} className="border-t"><td className="p-2"><p className="font-medium">{row.employee_name}</p><p className="text-xs text-muted-foreground">{row.employee_code}{row.existing ? " · Existing" : ""}</p></td><td className="p-2">{row.actual_check_in ?? "—"}</td><td className="p-2">{row.actual_check_out ?? "—"}</td><td className="p-2"><EmployeeAttendanceStatusBadge status={row.status} /></td><td className="p-2">{row.late_minutes}m</td><td className="p-2">{row.early_leave_minutes}m</td></tr>)}</tbody></table></div>}
        {preview.invalid.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{preview.invalid.map((row) => <p key={`invalid-${row.row}`}>Row {row.row}: {row.message}</p>)}</div>}
        {preview.unmatched.length > 0 && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-semibold text-amber-900">Fix unmatched biometric employees</p>{preview.unmatched.map((row) => { const identifier = row.biometric_id || row.employee_code; return <div key={`unmatched-${row.row}`} className="grid gap-2 rounded-md border border-amber-200 bg-white p-3 sm:grid-cols-[1fr_1.4fr] sm:items-center"><div><p className="text-xs font-medium">Row {row.row}: {row.employee_name || "Unknown employee"}</p><p className="text-[10px] text-muted-foreground">Machine ID: {identifier || "Missing identifier"}</p></div>{identifier ? <SearchPicker minChars={2} placeholder="Search matching employee..." searchFn={searchEmployees} queryKey={(search) => ["biometric-mapping-search", schoolId, row.row, search]} onSelect={(employee) => mapEmployee(identifier, employee.id)} emptyHint={{ icon: <Search className="h-4 w-4" />, title: "Find employee", description: "Choose the employee for this machine identifier." }} /> : <p className="text-xs text-red-700">Add an Employee ID or Biometric ID to this row.</p>}</div>; })}</div>}
      </div>}
    </div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>{!preview ? <Button disabled={!file || loading} onClick={() => submit("preview")}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Preview Import</Button> : <Button disabled={!preview.valid.length || loading} onClick={() => submit("import")}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import {preview.valid.length} Valid Rows</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}
