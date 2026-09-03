import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { AppError, NotFoundError } from "@/lib/api-response";
import { calculateEmployeeAttendance } from "@/lib/employee-attendance-calculations";
import { createSupabaseService } from "@/lib/supabase";
import { resolveEmployeeSchedule } from "@/services/employee-attendance.service";

type ImportConflictStrategy = "skip" | "replace" | "merge_missing";
type RawRow = Record<string, string>;

function normalizeRows(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [] as RawRow[];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false }).map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replace(/[\s-]+/g, "_"), String(value ?? "").trim()]))
  );
}

function value(row: RawRow, ...keys: string[]) {
  for (const key of keys) if (row[key]) return row[key];
  return "";
}

function normalizeDate(input: string, fallback: string) {
  if (!input) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(input);
  if (!match) return null;
  const shortYear = match[3].length === 2;
  const year = shortYear ? `20${match[3]}` : match[3];
  // SheetJS commonly formats ISO/Excel dates as M/D/YY. Four-digit
  // user-entered dates retain the documented DD/MM/YYYY interpretation.
  const month = shortYear ? match[1] : match[2];
  const day = shortYear ? match[2] : match[1];
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeTime(input: string) {
  if (!input) return null;
  const direct = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(input);
  if (direct) return `${direct[1].padStart(2, "0")}:${direct[2]}`;
  const twelveHour = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(input);
  if (!twelveHour) return null;
  let hour = Number(twelveHour[1]) % 12;
  if (twelveHour[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${twelveHour[2]}`;
}

function earlier(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;
  return left <= right ? left : right;
}

function later(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;
  return left >= right ? left : right;
}

export async function previewEmployeeAttendanceImport(
  schoolId: string,
  file: File,
  selectedDate: string,
  strategy: ImportConflictStrategy
) {
  if (selectedDate > new Date().toISOString().slice(0, 10)) throw new AppError("Attendance cannot be imported for a future date", "FUTURE_DATE");
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new AppError("Upload a CSV or Excel file", "INVALID_FILE");
  if (file.size > 10 * 1024 * 1024) throw new AppError("Attendance file must be 10 MB or smaller", "FILE_TOO_LARGE");
  const rows = normalizeRows(await file.arrayBuffer());
  if (!rows.length) throw new AppError("The attendance file has no data rows", "EMPTY_FILE");
  const supabase: SupabaseClient = createSupabaseService();
  const [{ data: employees, error: employeeError }, { data: mappings, error: mappingError }] = await Promise.all([
    supabase.from("employees").select("id,employee_code,name").eq("school_id", schoolId),
    supabase.from("biometric_employee_mappings").select("biometric_id,employee_id").eq("school_id", schoolId),
  ]);
  if (employeeError) throw new Error(`Failed to load employees: ${employeeError.message}`);
  if (mappingError) throw new Error(`Failed to load biometric mappings: ${mappingError.message}`);
  const employeeRows = (employees ?? []) as Array<{ id: string; employee_code: string | null; name: string }>;
  const byCode = new Map(employeeRows.filter((employee) => employee.employee_code).map((employee) => [employee.employee_code!.toLowerCase(), employee]));
  const byName = new Map(employeeRows.map((employee) => [employee.name.trim().toLowerCase(), employee]));
  const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]));
  const mapped = new Map(((mappings ?? []) as Array<{ biometric_id: string; employee_id: string }>).map((mapping) => [mapping.biometric_id.toLowerCase(), employeeById.get(mapping.employee_id)]));

  const invalid: Array<{ row: number; message: string; raw: RawRow }> = [];
  const unmatched: Array<{ row: number; biometric_id: string; employee_code: string; employee_name: string; raw: RawRow }> = [];
  const grouped = new Map<string, { employee: typeof employeeRows[number]; attendance_date: string; actual_check_in: string | null; actual_check_out: string | null; source_rows: number[] }>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const employeeCode = value(row, "employee_id", "employee_code", "staff_id", "personnel_no");
    const biometricId = value(row, "biometric_id", "machine_id", "ac_no", "user_id");
    const employeeName = value(row, "employee_name", "name");
    const machineIdentifier = biometricId || employeeCode;
    const employee = (machineIdentifier && mapped.get(machineIdentifier.toLowerCase())) || (employeeCode && byCode.get(employeeCode.toLowerCase())) || (employeeName && byName.get(employeeName.toLowerCase()));
    if (!employee) {
      unmatched.push({ row: rowNumber, biometric_id: biometricId, employee_code: employeeCode, employee_name: employeeName, raw: row });
      return;
    }
    const attendanceDate = normalizeDate(value(row, "attendance_date", "date", "punch_date"), selectedDate);
    if (!attendanceDate) {
      invalid.push({ row: rowNumber, message: "Invalid attendance date", raw: row });
      return;
    }
    const explicitIn = normalizeTime(value(row, "check_in_time", "check_in", "in_time", "time_in"));
    const explicitOut = normalizeTime(value(row, "check_out_time", "check_out", "out_time", "time_out"));
    const punch = normalizeTime(value(row, "punch_time", "time", "attendance_time"));
    if (!explicitIn && !explicitOut && !punch) {
      invalid.push({ row: rowNumber, message: "No valid check-in, check-out, or punch time", raw: row });
      return;
    }
    const key = `${employee.id}:${attendanceDate}`;
    const current = grouped.get(key) ?? { employee, attendance_date: attendanceDate, actual_check_in: null, actual_check_out: null, source_rows: [] };
    current.actual_check_in = earlier(current.actual_check_in, explicitIn ?? punch);
    current.actual_check_out = later(current.actual_check_out, explicitOut ?? punch);
    current.source_rows.push(rowNumber);
    grouped.set(key, current);
  });

  const groupedRows = [...grouped.values()];
  const existingResult = groupedRows.length
    ? await supabase.from("employee_attendance").select("*").eq("school_id", schoolId).in("employee_id", [...new Set(groupedRows.map((row) => row.employee.id))]).in("attendance_date", [...new Set(groupedRows.map((row) => row.attendance_date))])
    : { data: [], error: null };
  if (existingResult.error) throw new Error(`Failed to check existing attendance: ${existingResult.error.message}`);
  const existingByKey = new Map(((existingResult.data ?? []) as Array<Record<string, unknown>>).map((record) => [`${record.employee_id}:${record.attendance_date}`, record]));
  const valid = [];
  const skipped = [];
  for (const row of groupedRows) {
    const key = `${row.employee.id}:${row.attendance_date}`;
    const existing = existingByKey.get(key);
    if (existing && strategy === "skip") {
      skipped.push({ ...row, reason: "Existing attendance will be kept" });
      continue;
    }
    const schedule = await resolveEmployeeSchedule(schoolId, row.attendance_date);
    if (!schedule.is_working_day || schedule.attendance_closed) {
      invalid.push({ row: row.source_rows[0], message: `Attendance is closed: ${schedule.schedule_name}`, raw: {} });
      continue;
    }
    const actualCheckIn = strategy === "merge_missing" && existing ? String(existing.actual_check_in ?? row.actual_check_in ?? "") || null : row.actual_check_in;
    const actualCheckOut = strategy === "merge_missing" && existing ? String(existing.actual_check_out ?? row.actual_check_out ?? "") || null : row.actual_check_out;
    const calculated = calculateEmployeeAttendance({ ...schedule, actual_check_in: actualCheckIn, actual_check_out: actualCheckOut });
    valid.push({
      employee_id: row.employee.id,
      employee_code: row.employee.employee_code,
      employee_name: row.employee.name,
      attendance_date: row.attendance_date,
      scheduled_check_in: schedule.duty_start,
      scheduled_check_out: schedule.duty_end,
      actual_check_in: actualCheckIn,
      actual_check_out: actualCheckOut,
      status: calculated.status === "not_marked" ? "absent" : calculated.status,
      late_minutes: calculated.late_minutes,
      early_leave_minutes: calculated.early_leave_minutes,
      worked_minutes: calculated.worked_minutes,
      overtime_minutes: calculated.overtime_minutes,
      requires_review: calculated.requires_review,
      review_reason: calculated.review_reason,
      notes: null,
      existing: Boolean(existing),
      source_rows: row.source_rows,
    });
  }
  return { file_name: file.name, selected_date: selectedDate, strategy, total_rows: rows.length, valid, invalid, unmatched, skipped };
}

export async function commitEmployeeAttendanceImport(
  schoolId: string,
  adminId: string,
  file: File,
  selectedDate: string,
  strategy: ImportConflictStrategy
) {
  const preview = await previewEmployeeAttendanceImport(schoolId, file, selectedDate, strategy);
  if (!preview.valid.length) throw new AppError("No valid attendance rows are available to import", "NO_VALID_ROWS");
  const supabase: SupabaseClient = createSupabaseService();
  const { data: jobId, error } = await supabase.rpc("commit_employee_attendance_import", {
    p_school_id: schoolId,
    p_admin_id: adminId,
    p_file_name: file.name,
    p_attendance_date: selectedDate,
    p_conflict_strategy: strategy,
    p_rows: preview.valid,
  } as never);
  if (error) throw new Error(`Attendance import failed: ${error.message}`);
  await supabase.from("employee_attendance_import_jobs").update({
    total_rows: preview.total_rows,
    valid_rows: preview.valid.length,
    invalid_rows: preview.invalid.length,
    unmatched_rows: preview.unmatched.length,
    status: preview.invalid.length || preview.unmatched.length ? "partial" : "completed",
  } as never).eq("school_id", schoolId).eq("id", jobId as string);
  return { job_id: jobId as string, imported: preview.valid.length, invalid: preview.invalid.length, unmatched: preview.unmatched.length, skipped: preview.skipped.length };
}

export async function getEmployeeAttendanceImports(schoolId: string, jobId?: string) {
  const supabase: SupabaseClient = createSupabaseService();
  if (jobId) {
    const { data, error } = await supabase.from("employee_attendance_import_jobs").select("*,employee_attendance_import_rows(*)").eq("school_id", schoolId).eq("id", jobId).maybeSingle();
    if (error) throw new Error(`Failed to load import: ${error.message}`);
    if (!data) throw new NotFoundError("Import not found");
    return data;
  }
  const { data, error } = await supabase.from("employee_attendance_import_jobs").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(`Failed to load import history: ${error.message}`);
  return data ?? [];
}

export async function undoEmployeeAttendanceImport(schoolId: string, adminId: string, jobId: string) {
  const supabase: SupabaseClient = createSupabaseService();
  const { data: job, error: jobError } = await supabase.from("employee_attendance_import_jobs").select("*").eq("school_id", schoolId).eq("id", jobId).maybeSingle();
  if (jobError) throw new Error(`Failed to load import: ${jobError.message}`);
  if (!job) throw new NotFoundError("Import not found");
  if ((job as Record<string, unknown>).status === "undone") throw new AppError("This import was already undone", "ALREADY_UNDONE", 409);
  const { data: records, error: recordError } = await supabase.from("employee_attendance").select("*").eq("school_id", schoolId).eq("import_job_id", jobId);
  if (recordError) throw new Error(`Failed to load imported attendance: ${recordError.message}`);
  let removed = 0;
  let restored = 0;
  let skippedManualEdits = 0;
  for (const record of (records ?? []) as Array<Record<string, unknown>>) {
    if (!["imported", "import_edited"].includes(String(record.source))) {
      skippedManualEdits += 1;
      continue;
    }
    if (String(record.source) === "import_edited") {
      const { count: laterEditCount } = await supabase
        .from("employee_attendance_audit")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("attendance_id", record.id)
        .in("action", ["updated", "overridden"])
        .gt("changed_at", String((job as Record<string, unknown>).completed_at ?? (job as Record<string, unknown>).created_at));
      if ((laterEditCount ?? 0) > 0) {
        skippedManualEdits += 1;
        continue;
      }
    }
    const { data: audit } = await supabase.from("employee_attendance_audit").select("previous_value").eq("school_id", schoolId).eq("attendance_id", record.id).eq("action", "updated").order("changed_at", { ascending: false }).limit(1).maybeSingle();
    const previous = (audit as Record<string, unknown> | null)?.previous_value as Record<string, unknown> | null;
    if (previous?.id) {
      const restoredValue = { ...previous, source: previous.source ?? "manual", updated_by: adminId };
      const { error } = await supabase.from("employee_attendance").upsert(restoredValue as never, { onConflict: "school_id,employee_id,attendance_date" });
      if (error) throw new Error(`Failed to restore attendance: ${error.message}`);
      restored += 1;
    } else {
      const { error } = await supabase.from("employee_attendance").delete().eq("school_id", schoolId).eq("id", record.id);
      if (error) throw new Error(`Failed to remove imported attendance: ${error.message}`);
      removed += 1;
    }
    await supabase.from("employee_attendance_audit").insert({
      school_id: schoolId,
      attendance_id: previous?.id ?? null,
      employee_id: record.employee_id,
      attendance_date: record.attendance_date,
      action: "undo",
      previous_value: record,
      new_value: previous,
      changed_by: adminId,
      reason: "Undo biometric attendance import",
    } as never);
  }
  await supabase.from("employee_attendance_import_jobs").update({ status: "undone", undone_at: new Date().toISOString() } as never).eq("school_id", schoolId).eq("id", jobId);
  return { removed, restored, skipped_manual_edits: skippedManualEdits };
}

export async function saveBiometricEmployeeMapping(schoolId: string, biometricId: string, employeeId: string, machineName?: string | null) {
  const supabase: SupabaseClient = createSupabaseService();
  const { data: employee, error: employeeError } = await supabase.from("employees").select("id").eq("school_id", schoolId).eq("id", employeeId).maybeSingle();
  if (employeeError) throw new Error(`Failed to validate employee: ${employeeError.message}`);
  if (!employee) throw new NotFoundError("Employee not found");
  const { data, error } = await supabase.from("biometric_employee_mappings").upsert({
    school_id: schoolId,
    biometric_id: biometricId.trim(),
    employee_id: employeeId,
    machine_name: machineName?.trim() || null,
  } as never, { onConflict: "school_id,biometric_id" }).select("*").single();
  if (error) throw new Error(`Failed to save biometric mapping: ${error.message}`);
  return data;
}

export async function getBiometricEmployeeMappings(schoolId: string) {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase.from("biometric_employee_mappings").select("*,employees(id,name,employee_code)").eq("school_id", schoolId).order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load biometric mappings: ${error.message}`);
  return data ?? [];
}
