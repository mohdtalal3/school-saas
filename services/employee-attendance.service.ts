import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, NotFoundError } from "@/lib/api-response";
import { calculateEmployeeAttendance } from "@/lib/employee-attendance-calculations";
import { createSupabaseService } from "@/lib/supabase";
import type {
  DailyEmployeeAttendanceRow,
  Employee,
  EmployeeAttendanceRecord,
  EmployeeAttendanceSchedule,
  EmployeeAttendanceSettings,
  EmployeeAttendanceStatus,
  ResolvedEmployeeSchedule,
} from "@/types/school.types";

const DEFAULT_SETTINGS = {
  check_in_start: "07:45",
  check_in_end: "08:30",
  duty_start: "08:00",
  check_out_start: "13:45",
  check_out_end: "14:30",
  duty_end: "14:00",
  short_leave_threshold_minutes: 60,
  half_day_threshold_minutes: 180,
  late_grace_minutes: 5,
  early_checkout_grace_minutes: 5,
};

type ScheduleConfiguration = {
  settings: EmployeeAttendanceSettings;
  schedules: EmployeeAttendanceSchedule[];
};

export type DailyEmployeeAttendanceInput = {
  employee_id: string;
  actual_check_in?: string | null;
  actual_check_out?: string | null;
  status: EmployeeAttendanceStatus | "not_marked";
  is_manual_override?: boolean;
  notes?: string;
};

function weekdayPosition(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function dateRange(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const final = new Date(`${end}T00:00:00Z`);
  while (cursor <= final) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function asTime(value: string | null | undefined) {
  return value?.slice(0, 5) ?? null;
}

async function ensureSettings(supabase: SupabaseClient, schoolId: string) {
  const { data, error } = await supabase.from("employee_attendance_settings").select("*").eq("school_id", schoolId).maybeSingle();
  if (error) throw new Error(`Failed to load employee attendance settings: ${error.message}`);
  if (data) return data as unknown as EmployeeAttendanceSettings;
  const { data: created, error: createError } = await supabase
    .from("employee_attendance_settings")
    .insert({ school_id: schoolId, ...DEFAULT_SETTINGS } as never)
    .select("*")
    .single();
  if (createError) throw new Error(`Failed to create employee attendance settings: ${createError.message}`);
  return created as unknown as EmployeeAttendanceSettings;
}

async function seedWeekdaySchedules(supabase: SupabaseClient, schoolId: string) {
  const { count, error } = await supabase
    .from("employee_attendance_schedules")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if (error) throw new Error(`Failed to inspect employee schedules: ${error.message}`);
  if ((count ?? 0) > 0) return;
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const { error: insertError } = await supabase.from("employee_attendance_schedules").insert(
    names.map((name, index) => ({
      school_id: schoolId,
      name,
      schedule_type: "weekday",
      weekday: index + 1,
      is_working_day: index < 5,
      attendance_closed: index >= 5,
      closure_type: index >= 5 ? "weekly_off" : null,
    })) as never
  );
  if (insertError) throw new Error(`Failed to seed employee weekday schedules: ${insertError.message}`);
}

async function loadScheduleConfiguration(supabase: SupabaseClient, schoolId: string): Promise<ScheduleConfiguration> {
  const settings = await ensureSettings(supabase, schoolId);
  await seedWeekdaySchedules(supabase, schoolId);
  const { data, error } = await supabase
    .from("employee_attendance_schedules")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load employee schedules: ${error.message}`);
  return { settings, schedules: (data ?? []) as unknown as EmployeeAttendanceSchedule[] };
}

export function resolveEmployeeScheduleFromConfiguration(configuration: ScheduleConfiguration, date: string): ResolvedEmployeeSchedule {
  const weekday = weekdayPosition(date);
  const matching = configuration.schedules.filter((schedule) => {
    if (schedule.schedule_type === "weekday") return schedule.weekday === weekday;
    if (!schedule.start_date || !schedule.end_date) return false;
    return date >= schedule.start_date && date <= schedule.end_date;
  });
  const rank = { date_override: 4, date_range: 3, seasonal: 2, weekday: 1 } as const;
  matching.sort((a, b) => rank[b.schedule_type] - rank[a.schedule_type] || b.priority - a.priority || b.created_at.localeCompare(a.created_at));
  const selected = matching[0] ?? null;
  const settings = configuration.settings;
  return {
    ...settings,
    date,
    weekday,
    schedule_id: selected?.id ?? null,
    schedule_name: selected?.name ?? "Default employee schedule",
    schedule_type: selected?.schedule_type ?? "default",
    is_working_day: selected?.is_working_day ?? true,
    attendance_closed: selected?.attendance_closed ?? false,
    closure_type: selected?.closure_type ?? null,
    note: selected?.note ?? null,
    check_in_start: asTime(selected?.check_in_start) ?? asTime(settings.check_in_start) ?? DEFAULT_SETTINGS.check_in_start,
    check_in_end: asTime(selected?.check_in_end) ?? asTime(settings.check_in_end) ?? DEFAULT_SETTINGS.check_in_end,
    duty_start: asTime(selected?.duty_start) ?? asTime(settings.duty_start) ?? DEFAULT_SETTINGS.duty_start,
    check_out_start: asTime(selected?.check_out_start) ?? asTime(settings.check_out_start) ?? DEFAULT_SETTINGS.check_out_start,
    check_out_end: asTime(selected?.check_out_end) ?? asTime(settings.check_out_end) ?? DEFAULT_SETTINGS.check_out_end,
    duty_end: asTime(selected?.duty_end) ?? asTime(settings.duty_end) ?? DEFAULT_SETTINGS.duty_end,
    short_leave_threshold_minutes: selected?.short_leave_threshold_minutes ?? settings.short_leave_threshold_minutes,
    half_day_threshold_minutes: selected?.half_day_threshold_minutes ?? settings.half_day_threshold_minutes,
    late_grace_minutes: selected?.late_grace_minutes ?? settings.late_grace_minutes,
    early_checkout_grace_minutes: selected?.early_checkout_grace_minutes ?? settings.early_checkout_grace_minutes,
  };
}

export async function resolveEmployeeSchedule(schoolId: string, date: string) {
  const supabase: SupabaseClient = createSupabaseService();
  return resolveEmployeeScheduleFromConfiguration(await loadScheduleConfiguration(supabase, schoolId), date);
}

export async function getEmployeeAttendanceConfiguration(schoolId: string) {
  const supabase: SupabaseClient = createSupabaseService();
  return loadScheduleConfiguration(supabase, schoolId);
}

export async function updateEmployeeAttendanceSettings(
  schoolId: string,
  input: Partial<Omit<EmployeeAttendanceSettings, "id" | "school_id" | "created_at" | "updated_at">>
) {
  const supabase: SupabaseClient = createSupabaseService();
  await ensureSettings(supabase, schoolId);
  const { data, error } = await supabase.from("employee_attendance_settings").update(input as never).eq("school_id", schoolId).select("*").single();
  if (error) throw new Error(`Failed to update employee attendance settings: ${error.message}`);
  return data as unknown as EmployeeAttendanceSettings;
}

export async function saveEmployeeSchedule(
  schoolId: string,
  input: Omit<EmployeeAttendanceSchedule, "id" | "school_id" | "created_at" | "updated_at"> & { id?: string }
) {
  const supabase: SupabaseClient = createSupabaseService();
  const payload = { ...input, school_id: schoolId };
  const query = input.id
    ? supabase.from("employee_attendance_schedules").update(payload as never).eq("school_id", schoolId).eq("id", input.id)
    : supabase.from("employee_attendance_schedules").insert(payload as never);
  const { data, error } = await query.select("*").single();
  if (error) throw new Error(`Failed to save employee schedule: ${error.message}`);
  return data as unknown as EmployeeAttendanceSchedule;
}

export async function deleteEmployeeSchedule(schoolId: string, scheduleId: string) {
  const supabase: SupabaseClient = createSupabaseService();
  const { error } = await supabase.from("employee_attendance_schedules").delete().eq("school_id", schoolId).eq("id", scheduleId);
  if (error) throw new Error(`Failed to delete employee schedule: ${error.message}`);
  return { deleted: true };
}

export async function getDailyEmployeeAttendance(
  schoolId: string,
  date: string,
  filters: { designation?: string; search?: string; status?: string } = {}
) {
  const supabase: SupabaseClient = createSupabaseService();
  const configuration = await loadScheduleConfiguration(supabase, schoolId);
  const schedule = resolveEmployeeScheduleFromConfiguration(configuration, date);
  let employeeQuery = supabase.from("employees").select("id,employee_code,name,role,photo_url").eq("school_id", schoolId).eq("is_active", true);
  if (filters.designation) employeeQuery = employeeQuery.eq("role", filters.designation);
  if (filters.search?.trim()) {
    const search = filters.search.trim().replace(/[,%]/g, "");
    employeeQuery = employeeQuery.or(`name.ilike.%${search}%,employee_code.ilike.%${search}%`);
  }
  const [{ data: employees, error: employeeError }, { data: attendance, error: attendanceError }, { data: filterEmployees }] = await Promise.all([
    employeeQuery.order("name"),
    supabase.from("employee_attendance").select("*").eq("school_id", schoolId).eq("attendance_date", date),
    supabase.from("employees").select("role").eq("school_id", schoolId).eq("is_active", true),
  ]);
  if (employeeError) throw new Error(`Failed to load employees: ${employeeError.message}`);
  if (attendanceError) throw new Error(`Failed to load employee attendance: ${attendanceError.message}`);
  const records = new Map(((attendance ?? []) as unknown as EmployeeAttendanceRecord[]).map((record) => [record.employee_id, record]));
  const isWorkingDay = schedule.is_working_day && !schedule.attendance_closed;
  let rows: DailyEmployeeAttendanceRow[] = isWorkingDay ? ((employees ?? []) as Array<Record<string, unknown>>).map((employee) => {
    const record = records.get(String(employee.id));
    return {
      employee_id: String(employee.id),
      employee_code: employee.employee_code as string | null,
      employee_name: String(employee.name),
      designation: String(employee.role),
      photo_url: employee.photo_url as string | null,
      scheduled_check_in: asTime(record?.scheduled_check_in) ?? schedule.duty_start,
      scheduled_check_out: asTime(record?.scheduled_check_out) ?? schedule.duty_end,
      actual_check_in: asTime(record?.actual_check_in),
      actual_check_out: asTime(record?.actual_check_out),
      late_minutes: record?.late_minutes ?? 0,
      early_leave_minutes: record?.early_leave_minutes ?? 0,
      worked_minutes: record?.worked_minutes ?? null,
      overtime_minutes: record?.overtime_minutes ?? 0,
      status: record?.status ?? "not_marked",
      source: record?.source ?? null,
      is_manual_override: record?.is_manual_override ?? false,
      requires_review: record?.requires_review ?? false,
      review_reason: record?.review_reason ?? null,
      notes: record?.notes ?? "",
    };
  }) : [];
  if (filters.status) rows = rows.filter((row) => row.status === filters.status);
  const rawFilterEmployees = (filterEmployees ?? []) as Array<{ role: string }>;
  return {
    date,
    schedule,
    isWorkingDay,
    dayStatus: !schedule.is_working_day || schedule.attendance_closed ? schedule.closure_type ?? "weekly_off" : "working_day",
    rows,
    filters: {
      designations: Array.from(new Set(rawFilterEmployees.map((employee) => employee.role).filter(Boolean))).sort(),
    },
  };
}

export async function saveDailyEmployeeAttendance(
  schoolId: string,
  adminId: string,
  date: string,
  records: DailyEmployeeAttendanceInput[],
  finalizeMissing = false
) {
  const supabase: SupabaseClient = createSupabaseService();
  if (date > new Date().toISOString().slice(0, 10)) throw new AppError("Attendance cannot be saved for a future date", "FUTURE_DATE", 400);
  const configuration = await loadScheduleConfiguration(supabase, schoolId);
  const schedule = resolveEmployeeScheduleFromConfiguration(configuration, date);
  if (!schedule.is_working_day || schedule.attendance_closed) throw new AppError("Employee attendance is closed for this date", "NON_WORKING_DAY", 409);
  const workRecords = [...records];
  const uniqueIds = new Set(workRecords.map((record) => record.employee_id));
  if (uniqueIds.size !== records.length) throw new AppError("Each employee can only appear once", "DUPLICATE_EMPLOYEE");
  if (uniqueIds.size) {
    const { data: employees, error: employeeError } = await supabase.from("employees").select("id").eq("school_id", schoolId).eq("is_active", true).in("id", [...uniqueIds]);
    if (employeeError) throw new Error(`Failed to validate employees: ${employeeError.message}`);
    if ((employees ?? []).length !== uniqueIds.size) throw new AppError("One or more employees are invalid", "INVALID_EMPLOYEE");
  }
  if (finalizeMissing) {
    const [{ data: allEmployees, error: allEmployeeError }, { data: existingRows, error: existingError }] = await Promise.all([
      supabase.from("employees").select("id").eq("school_id", schoolId).eq("is_active", true),
      supabase.from("employee_attendance").select("employee_id").eq("school_id", schoolId).eq("attendance_date", date),
    ]);
    if (allEmployeeError) throw new Error(`Failed to load active employees: ${allEmployeeError.message}`);
    if (existingError) throw new Error(`Failed to load existing attendance: ${existingError.message}`);
    const alreadySaved = new Set(((existingRows ?? []) as Array<{ employee_id: string }>).map((row) => row.employee_id));
    ((allEmployees ?? []) as Array<{ id: string }>).forEach((employee) => {
      if (!uniqueIds.has(employee.id) && !alreadySaved.has(employee.id)) {
        workRecords.push({ employee_id: employee.id, status: "not_marked", actual_check_in: null, actual_check_out: null });
      }
    });
  }

  let saved = 0;
  let unmarked = 0;
  for (const input of workRecords) {
    const previousResult = await supabase.from("employee_attendance").select("*").eq("school_id", schoolId).eq("employee_id", input.employee_id).eq("attendance_date", date).maybeSingle();
    if (previousResult.error) throw new Error(`Failed to load existing attendance: ${previousResult.error.message}`);
    const previous = previousResult.data as Record<string, unknown> | null;
    const manualStatus = input.is_manual_override && input.status !== "not_marked" ? input.status : null;
    const calculated = calculateEmployeeAttendance({
      ...schedule,
      actual_check_in: input.actual_check_in,
      actual_check_out: input.actual_check_out,
      manual_status: manualStatus,
      finalize_missing: finalizeMissing,
    });
    if (calculated.status === "not_marked") {
      if (previous) {
        const { error: deleteError } = await supabase.from("employee_attendance").delete().eq("school_id", schoolId).eq("id", previous.id);
        if (deleteError) throw new Error(`Failed to clear employee attendance: ${deleteError.message}`);
        const { error: auditError } = await supabase.from("employee_attendance_audit").insert({
          school_id: schoolId,
          attendance_id: null,
          employee_id: input.employee_id,
          attendance_date: date,
          action: "updated",
          previous_value: previous,
          new_value: null,
          changed_by: adminId,
          reason: input.notes?.trim() || "Attendance reset to Not Marked",
        } as never);
        if (auditError) throw new Error(`Attendance cleared but audit logging failed: ${auditError.message}`);
      }
      unmarked += 1;
      continue;
    }
    const payload = {
      school_id: schoolId,
      employee_id: input.employee_id,
      attendance_date: date,
      scheduled_check_in: schedule.duty_start,
      scheduled_check_out: schedule.duty_end,
      actual_check_in: input.actual_check_in || null,
      actual_check_out: input.actual_check_out || null,
      status: calculated.status,
      late_minutes: calculated.late_minutes,
      early_leave_minutes: calculated.early_leave_minutes,
      worked_minutes: calculated.worked_minutes,
      overtime_minutes: calculated.overtime_minutes,
      source: previous?.import_job_id ? "import_edited" : input.is_manual_override ? "manual" : "automatic",
      is_manual_override: Boolean(input.is_manual_override),
      requires_review: calculated.requires_review,
      review_reason: calculated.review_reason,
      notes: input.notes?.trim() || null,
      created_by: previous ? previous.created_by : adminId,
      updated_by: adminId,
    };
    const { data, error } = await supabase.from("employee_attendance").upsert(payload as never, { onConflict: "school_id,employee_id,attendance_date" }).select("*").single();
    if (error) throw new Error(`Failed to save employee attendance: ${error.message}`);
    const { error: auditError } = await supabase.from("employee_attendance_audit").insert({
      school_id: schoolId,
      attendance_id: (data as Record<string, unknown>).id,
      employee_id: input.employee_id,
      attendance_date: date,
      action: previous ? input.is_manual_override ? "overridden" : "updated" : "created",
      previous_value: previous,
      new_value: data,
      changed_by: adminId,
      reason: input.notes?.trim() || (input.is_manual_override ? "Manual attendance override" : "Daily attendance save"),
    } as never);
    if (auditError) throw new Error(`Attendance saved but audit logging failed: ${auditError.message}`);
    saved += 1;
  }
  return { saved, unmarked };
}

type EmployeeReportStats = {
  working_days: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  short_leave: number;
  half_day: number;
  holidays: number;
  weekly_offs: number;
  total_late_minutes: number;
  total_early_leave_minutes: number;
  total_worked_minutes: number;
  incomplete_records: number;
};

function emptyEmployeeStats(): EmployeeReportStats {
  return { working_days: 0, present: 0, late: 0, absent: 0, leave: 0, short_leave: 0, half_day: 0, holidays: 0, weekly_offs: 0, total_late_minutes: 0, total_early_leave_minutes: 0, total_worked_minutes: 0, incomplete_records: 0 };
}

export function employeeAttendanceMonthBounds(month: string, today = new Date().toISOString().slice(0, 10)) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) throw new AppError("Use a valid month", "INVALID_MONTH");
  const startDate = `${month}-01`;
  const last = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { startDate, endDate: month === today.slice(0, 7) ? today : last };
}

export function employeeAttendanceCalendarMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) throw new AppError("Use a valid month", "INVALID_MONTH");
  return {
    startDate: `${month}-01`,
    endDate: new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10),
  };
}

function summarizeEmployee(
  dates: string[],
  schedules: Map<string, ResolvedEmployeeSchedule>,
  records: EmployeeAttendanceRecord[]
) {
  const stats = emptyEmployeeStats();
  const recordByDate = new Map(records.map((record) => [record.attendance_date, record]));
  for (const date of dates) {
    const schedule = schedules.get(date)!;
    if (!schedule.is_working_day || schedule.attendance_closed) {
      if (schedule.closure_type === "weekly_off") stats.weekly_offs += 1;
      else stats.holidays += 1;
      continue;
    }
    stats.working_days += 1;
    const record = recordByDate.get(date);
    if (!record) continue;
    stats[record.status] += 1;
    stats.total_late_minutes += record.late_minutes;
    stats.total_early_leave_minutes += record.early_leave_minutes;
    stats.total_worked_minutes += record.worked_minutes ?? 0;
    if (record.requires_review || !record.actual_check_in || !record.actual_check_out) stats.incomplete_records += 1;
  }
  return stats;
}

export async function getEmployeeMonthlyReport(
  schoolId: string,
  month: string,
  filters: { designation?: string; employeeId?: string; status?: string; active?: "true" | "false" | "all" } = {}
) {
  const supabase: SupabaseClient = createSupabaseService();
  const { startDate, endDate } = employeeAttendanceMonthBounds(month);
  const dates = dateRange(startDate, endDate);
  const configuration = await loadScheduleConfiguration(supabase, schoolId);
  const schedules = new Map(dates.map((date) => [date, resolveEmployeeScheduleFromConfiguration(configuration, date)]));
  let employeeQuery = supabase.from("employees").select("id,employee_code,name,role,is_active,photo_url,date_of_joining").eq("school_id", schoolId);
  if (filters.active !== "all") employeeQuery = employeeQuery.eq("is_active", filters.active !== "false");
  if (filters.designation) employeeQuery = employeeQuery.eq("role", filters.designation);
  if (filters.employeeId) employeeQuery = employeeQuery.eq("id", filters.employeeId);
  const [{ data: employees, error: employeeError }, { data: attendance, error: attendanceError }] = await Promise.all([
    employeeQuery.order("name"),
    supabase.from("employee_attendance").select("*").eq("school_id", schoolId).gte("attendance_date", startDate).lte("attendance_date", endDate),
  ]);
  if (employeeError) throw new Error(`Failed to load employees: ${employeeError.message}`);
  if (attendanceError) throw new Error(`Failed to load monthly attendance: ${attendanceError.message}`);
  const attendanceRows = (attendance ?? []) as unknown as EmployeeAttendanceRecord[];
  let rows = ((employees ?? []) as Array<Record<string, unknown>>).map((employee) => ({
    employee_id: String(employee.id),
    employee_code: employee.employee_code as string | null,
    employee_name: String(employee.name),
    designation: String(employee.role),
    is_active: Boolean(employee.is_active),
    photo_url: employee.photo_url as string | null,
    ...summarizeEmployee(dates.filter((date) => date >= String(employee.date_of_joining)), schedules, attendanceRows.filter((record) => record.employee_id === employee.id)),
  }));
  if (filters.status) rows = rows.filter((row) => Number(row[filters.status as keyof typeof row] ?? 0) > 0);
  const totals = rows.reduce((result, row) => {
    Object.keys(emptyEmployeeStats()).forEach((key) => { result[key as keyof EmployeeReportStats] += Number(row[key as keyof typeof row] ?? 0); });
    return result;
  }, emptyEmployeeStats());
  return { month, startDate, endDate, rows, totals };
}

export async function getEmployeeDetailedReport(schoolId: string, employeeId: string, month: string) {
  const supabase: SupabaseClient = createSupabaseService();
  const { startDate, endDate } = employeeAttendanceMonthBounds(month);
  const [{ data: employee, error: employeeError }, configuration, { data: records, error: recordError }, { data: employeeList }] = await Promise.all([
    supabase.from("employees").select("id,employee_code,name,role,is_active,photo_url,date_of_joining").eq("school_id", schoolId).eq("id", employeeId).maybeSingle(),
    loadScheduleConfiguration(supabase, schoolId),
    supabase.from("employee_attendance").select("*").eq("school_id", schoolId).eq("employee_id", employeeId).gte("attendance_date", startDate).lte("attendance_date", endDate).order("attendance_date"),
    supabase.from("employees").select("id,name").eq("school_id", schoolId).order("name"),
  ]);
  if (employeeError) throw new Error(`Failed to load employee: ${employeeError.message}`);
  if (!employee) throw new NotFoundError("Employee not found");
  if (recordError) throw new Error(`Failed to load employee attendance: ${recordError.message}`);
  const dates = dateRange(startDate, endDate).filter((date) => date >= String((employee as Record<string, unknown>).date_of_joining));
  const schedules = new Map(dates.map((date) => [date, resolveEmployeeScheduleFromConfiguration(configuration, date)]));
  const attendance = (records ?? []) as unknown as EmployeeAttendanceRecord[];
  const recordByDate = new Map(attendance.map((record) => [record.attendance_date, record]));
  const days = dates.map((date) => {
    const schedule = schedules.get(date)!;
    const record = recordByDate.get(date) ?? null;
    return {
      date,
      day: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
      schedule,
      record,
      status: !schedule.is_working_day || schedule.attendance_closed ? schedule.closure_type === "weekly_off" ? "weekly_off" : "holiday" : record?.status ?? "not_marked",
    };
  });
  const ordered = (employeeList ?? []) as Array<{ id: string; name: string }>;
  const index = ordered.findIndex((item) => item.id === employeeId);
  return {
    employee: employee as unknown as Pick<Employee, "id" | "employee_code" | "name" | "role" | "is_active" | "photo_url">,
    month,
    startDate,
    endDate,
    stats: summarizeEmployee(dates, schedules, attendance),
    days,
    navigation: { previous: index > 0 ? ordered[index - 1] : null, next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null },
  };
}

export async function getEmployeeAttendanceCalendar(schoolId: string, month: string) {
  const supabase: SupabaseClient = createSupabaseService();
  const { startDate, endDate } = employeeAttendanceCalendarMonthBounds(month);
  const today = new Date().toISOString().slice(0, 10);
  const configuration = await loadScheduleConfiguration(supabase, schoolId);
  const [{ data: attendance, error }, { data: activeEmployees }] = await Promise.all([
    supabase.from("employee_attendance").select("attendance_date,status,requires_review").eq("school_id", schoolId).gte("attendance_date", startDate).lte("attendance_date", endDate),
    supabase.from("employees").select("id,date_of_joining").eq("school_id", schoolId).eq("is_active", true),
  ]);
  if (error) throw new Error(`Failed to load attendance calendar: ${error.message}`);
  const records = (attendance ?? []) as Array<{ attendance_date: string; status: EmployeeAttendanceStatus; requires_review: boolean }>;
  const days = dateRange(startDate, endDate).map((date) => {
    const schedule = resolveEmployeeScheduleFromConfiguration(configuration, date);
    const dateRecords = records.filter((record) => record.attendance_date === date);
    const counts = dateRecords.reduce<Record<string, number>>((result, record) => {
      result[record.status] = (result[record.status] ?? 0) + 1;
      if (record.requires_review) result.incomplete = (result.incomplete ?? 0) + 1;
      return result;
    }, {});
    const eligibleEmployees = ((activeEmployees ?? []) as Array<{ id: string; date_of_joining: string }>).filter((employee) => employee.date_of_joining <= date).length;
    return { date, schedule, counts, not_marked: date <= today && schedule.is_working_day && !schedule.attendance_closed ? Math.max(0, eligibleEmployees - dateRecords.length) : 0 };
  });
  return { month, startDate, endDate, days };
}

export async function getEmployeeAttendanceAudit(schoolId: string, employeeId: string, date: string) {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase.from("employee_attendance_audit").select("*").eq("school_id", schoolId).eq("employee_id", employeeId).eq("attendance_date", date).order("changed_at", { ascending: false });
  if (error) throw new Error(`Failed to load attendance history: ${error.message}`);
  return data ?? [];
}
