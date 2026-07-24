import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseService } from "@/lib/supabase";
import { AppError, NotFoundError } from "@/lib/api-response";
import { getWeekdays } from "@/services/timetable.service";
import type {
  AttendanceDayStatus,
  AttendanceHoliday,
  AttendanceHolidayScope,
  AttendanceHolidayType,
  AttendanceStats,
  AttendanceStatus,
  ClassAttendanceReport,
  DailyAttendanceStudent,
  StudentAttendance,
  StudentAttendanceReport,
} from "@/types/school.types";

type AttendanceInput = { student_id: string; status: AttendanceStatus; note?: string };
type HolidayInput = {
  holiday_date: string;
  end_date: string;
  title: string;
  holiday_type: AttendanceHolidayType;
  scope: AttendanceHolidayScope;
  class_ids?: string[];
  student_ids?: string[];
  note?: string | null;
};

function emptyStats(): AttendanceStats {
  return { present: 0, absent: 0, late: 0, leave: 0, marked: 0, attendanceRate: 0 };
}

function finalizeStats(stats: AttendanceStats): AttendanceStats {
  const marked = stats.present + stats.absent + stats.late + stats.leave;
  return { ...stats, marked, attendanceRate: marked ? Math.round(((stats.present + stats.late) / marked) * 1000) / 10 : 0 };
}

function countStatuses(rows: Array<{ status: AttendanceStatus }>): AttendanceStats {
  const stats = emptyStats();
  rows.forEach((row) => { stats[row.status] += 1; });
  return finalizeStats(stats);
}

async function getClass(supabase: SupabaseClient, schoolId: string, classId: string) {
  const { data, error } = await supabase.from("classes").select("id,name").eq("school_id", schoolId).eq("id", classId).eq("is_active", true).maybeSingle();
  if (error) throw new Error(`Failed to validate class: ${error.message}`);
  if (!data) throw new NotFoundError("Class not found");
  return data as { id: string; name: string };
}

function weekdayPosition(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function normalizeHoliday(row: Record<string, unknown>): AttendanceHoliday {
  const classRelations = (row.attendance_holiday_classes ?? []) as Array<{ class_id: string }>;
  const studentRelations = (row.attendance_holiday_students ?? []) as Array<{ student_id: string; students?: { id: string; name: string; registration_no: string | null } | null }>;
  const { attendance_holiday_classes: _classes, attendance_holiday_students: _students, ...holiday } = row;
  return {
    ...(holiday as unknown as Omit<AttendanceHoliday, "class_ids" | "students">),
    class_ids: classRelations.map((relation) => relation.class_id),
    students: studentRelations.map((relation) => relation.students ?? { id: relation.student_id, name: "Student", registration_no: null }),
  };
}

async function loadCalendarRules(supabase: SupabaseClient, schoolId: string, startDate: string, endDate: string, classIds: string[]) {
  const uniqueClassIds = Array.from(new Set(classIds.filter(Boolean)));
  const assignmentPromise = uniqueClassIds.length
    ? supabase.from("class_weekdays").select("class_id,weekday_id,is_weekend").eq("school_id", schoolId).in("class_id", uniqueClassIds)
    : Promise.resolve({ data: [], error: null });
  const [weekdays, assignmentsResult, holidaysResult] = await Promise.all([
    getWeekdays(schoolId),
    assignmentPromise,
    supabase.from("attendance_holidays").select("*,attendance_holiday_classes(class_id),attendance_holiday_students(student_id,students(id,name,registration_no))").eq("school_id", schoolId).lte("holiday_date", endDate).gte("end_date", startDate).order("holiday_date"),
  ]);
  if (assignmentsResult.error) throw new Error(`Failed to load class weekdays: ${assignmentsResult.error.message}`);
  if (holidaysResult.error) throw new Error(`Failed to load attendance calendar: ${holidaysResult.error.message}`);
  const positionByWeekdayId = new Map(weekdays.map((weekday) => [weekday.id, weekday.sort_order]));
  const assignedPositions = new Map<string, Set<number>>();
  const classWeekendPositions = new Map<string, Set<number>>();
  ((assignmentsResult.data ?? []) as Array<{ class_id: string; weekday_id: string; is_weekend: boolean }>).forEach((assignment) => {
    const position = positionByWeekdayId.get(assignment.weekday_id);
    if (position == null) return;
    const positions = assignedPositions.get(assignment.class_id) ?? new Set<number>();
    if (assignment.is_weekend) {
      const weekends = classWeekendPositions.get(assignment.class_id) ?? new Set<number>();
      weekends.add(position);
      classWeekendPositions.set(assignment.class_id, weekends);
    } else {
      positions.add(position);
    }
    assignedPositions.set(assignment.class_id, positions);
  });
  const weekendPositions = new Set(weekdays.filter((weekday) => weekday.is_weekend).map((weekday) => weekday.sort_order));
  const holidays = ((holidaysResult.data ?? []) as Array<Record<string, unknown>>).map(normalizeHoliday);
  const classWorksOn = (classId: string, date: string) => {
    const assigned = assignedPositions.get(classId);
    return assigned ? assigned.has(weekdayPosition(date)) : !weekendPositions.has(weekdayPosition(date));
  };
  const applicableHoliday = (date: string, classId: string, studentId?: string) => holidays.find((holiday) => {
    if (date < holiday.holiday_date || date > holiday.end_date) return false;
    if (holiday.scope === "school") return true;
    if (holiday.scope === "classes") return holiday.class_ids.includes(classId);
    return Boolean(studentId && holiday.students.some((student) => student.id === studentId));
  }) ?? null;
  return { weekdays, holidays, assignedPositions, classWeekendPositions, classWorksOn, applicableHoliday };
}

function resolveDayFromRules(rules: Awaited<ReturnType<typeof loadCalendarRules>>, classId: string, date: string): AttendanceDayStatus {
  const weekday = rules.weekdays.find((item) => item.sort_order === weekdayPosition(date));
  const weekdayName = weekday?.name ?? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const holiday = rules.applicableHoliday(date, classId);
  if (holiday) return { date, weekdayName, isWorkingDay: false, reason: "holiday", holiday };
  if (!rules.classWorksOn(classId, date)) {
    const isConfiguredWeekend = rules.classWeekendPositions.get(classId)?.has(weekdayPosition(date));
    return { date, weekdayName, isWorkingDay: false, reason: isConfiguredWeekend || !rules.assignedPositions.has(classId) ? "weekend" : "class_off", holiday: null };
  }
  return { date, weekdayName, isWorkingDay: true, reason: "working_day", holiday: null };
}

export async function resolveAttendanceDay(schoolId: string, classId: string, date: string): Promise<AttendanceDayStatus> {
  const supabase: SupabaseClient = createSupabaseService();
  return resolveDayFromRules(await loadCalendarRules(supabase, schoolId, date, date, [classId]), classId, date);
}

export async function getDailyAttendance(schoolId: string, classId: string, date: string) {
  const supabase: SupabaseClient = createSupabaseService();
  const [schoolClass, rules] = await Promise.all([
    getClass(supabase, schoolId, classId),
    loadCalendarRules(supabase, schoolId, date, date, [classId]),
  ]);
  const dayStatus = resolveDayFromRules(rules, classId, date);
  if (!dayStatus.isWorkingDay) return { class: schoolClass, date, dayStatus, students: [] as DailyAttendanceStudent[] };
  const [{ data: students, error: studentError }, { data: attendance, error: attendanceError }] = await Promise.all([
    supabase.from("students").select("id,name,registration_no,photo_url").eq("school_id", schoolId).eq("class_id", classId).eq("is_active", true).order("name"),
    supabase.from("student_attendance").select("student_id,status,note").eq("school_id", schoolId).eq("class_id", classId).eq("attendance_date", date),
  ]);
  if (studentError) throw new Error(`Failed to fetch class students: ${studentError.message}`);
  if (attendanceError) throw new Error(`Failed to fetch attendance: ${attendanceError.message}`);
  const saved = new Map(((attendance ?? []) as Array<{ student_id: string; status: AttendanceStatus; note: string | null }>).map((row) => [row.student_id, row]));
  const rows: DailyAttendanceStudent[] = ((students ?? []) as Array<{ id: string; name: string; registration_no: string | null; photo_url: string | null }>).map((student) => {
    const record = saved.get(student.id);
    const exemption = rules.applicableHoliday(date, classId, student.id);
    return { student_id: student.id, name: student.name, registration_no: student.registration_no, photo_url: student.photo_url, status: exemption ? "not_marked" : record?.status ?? "not_marked", note: exemption ? "" : record?.note ?? "", is_exempt: Boolean(exemption), exemption_title: exemption?.title ?? null };
  });
  return { class: schoolClass, date, dayStatus, students: rows };
}

export async function saveDailyAttendance(schoolId: string, classId: string, date: string, records: AttendanceInput[], confirmPartial = false) {
  const supabase: SupabaseClient = createSupabaseService();
  const [, rules] = await Promise.all([getClass(supabase, schoolId, classId), loadCalendarRules(supabase, schoolId, date, date, [classId])]);
  const dayStatus = resolveDayFromRules(rules, classId, date);
  if (!dayStatus.isWorkingDay) throw new AppError(dayStatus.reason === "holiday" ? `Attendance cannot be saved on ${dayStatus.holiday?.title ?? "a holiday"}` : "This class does not attend on this weekday", "NON_WORKING_DAY", 409);
  const ids = Array.from(new Set(records.map((record) => record.student_id)));
  if (ids.length !== records.length) throw new AppError("Each student can only appear once", "DUPLICATE_STUDENT", 400);
  const { data: students, error: studentError } = await supabase.from("students").select("id").eq("school_id", schoolId).eq("class_id", classId).eq("is_active", true);
  if (studentError) throw new Error(`Failed to validate students: ${studentError.message}`);
  const allIds = ((students ?? []) as Array<{ id: string }>).map((student) => student.id);
  const validIds = new Set(allIds.filter((studentId) => !rules.applicableHoliday(date, classId, studentId)));
  if (ids.some((id) => !validIds.has(id))) throw new AppError("One or more students are not eligible for attendance on this date", "INVALID_STUDENT", 400);
  if (records.length < validIds.size && !confirmPartial) throw new AppError("Some students are still Not Marked. Confirm a partial save to continue.", "UNMARKED_STUDENTS", 409);
  if (records.length) {
    const { error } = await supabase.from("student_attendance").upsert(records.map((record) => ({ school_id: schoolId, class_id: classId, student_id: record.student_id, attendance_date: date, status: record.status, note: record.note?.trim() || null })) as never, { onConflict: "school_id,student_id,attendance_date" });
    if (error) throw new Error(`Failed to save attendance: ${error.message}`);
  }
  const removedIds = Array.from(validIds).filter((id) => !ids.includes(id));
  if (removedIds.length) {
    const { error } = await supabase.from("student_attendance").delete().eq("school_id", schoolId).eq("class_id", classId).eq("attendance_date", date).in("student_id", removedIds);
    if (error) throw new Error(`Failed to clear unmarked attendance: ${error.message}`);
  }
  return { saved: records.length, unmarked: validIds.size - records.length };
}

export async function getStudentAttendanceReport(schoolId: string, studentId: string, startDate: string, endDate: string): Promise<StudentAttendanceReport> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data: student, error: studentError } = await supabase.from("students").select("id,name,registration_no,photo_url,classes(name)").eq("school_id", schoolId).eq("id", studentId).maybeSingle();
  if (studentError) throw new Error(`Failed to fetch student: ${studentError.message}`);
  if (!student) throw new NotFoundError("Student not found");
  const { data, error } = await supabase.from("student_attendance").select("*,classes(name)").eq("school_id", schoolId).eq("student_id", studentId).gte("attendance_date", startDate).lte("attendance_date", endDate).order("attendance_date", { ascending: true });
  if (error) throw new Error(`Failed to fetch student attendance: ${error.message}`);
  const rawRows = (data ?? []) as Array<Record<string, unknown>>;
  const classIds = rawRows.map((row) => String(row.class_id));
  const rules = await loadCalendarRules(supabase, schoolId, startDate, endDate, classIds);
  const records = rawRows.filter((row) => rules.classWorksOn(String(row.class_id), String(row.attendance_date)) && !rules.applicableHoliday(String(row.attendance_date), String(row.class_id), studentId)).map((row) => {
    const relation = row.classes as { name?: string } | null;
    const { classes: _classes, ...attendance } = row;
    return { ...(attendance as unknown as StudentAttendance), class_name: relation?.name ?? null };
  });
  const classRelation = (student as Record<string, unknown>).classes as { name?: string } | null;
  return { student: { id: String((student as Record<string, unknown>).id), name: String((student as Record<string, unknown>).name), registration_no: ((student as Record<string, unknown>).registration_no as string | null) ?? null, photo_url: ((student as Record<string, unknown>).photo_url as string | null) ?? null, class_name: classRelation?.name ?? null }, startDate, endDate, records, stats: countStatuses(records) };
}

export async function getClassAttendanceReport(schoolId: string, classId: string, startDate: string, endDate: string): Promise<ClassAttendanceReport> {
  const supabase: SupabaseClient = createSupabaseService();
  const schoolClass = await getClass(supabase, schoolId, classId);
  const [{ data: students, error: studentError }, { data: attendance, error: attendanceError }, rules] = await Promise.all([
    supabase.from("students").select("id,name,registration_no").eq("school_id", schoolId).eq("class_id", classId).eq("is_active", true).order("name"),
    supabase.from("student_attendance").select("student_id,status,attendance_date").eq("school_id", schoolId).eq("class_id", classId).gte("attendance_date", startDate).lte("attendance_date", endDate),
    loadCalendarRules(supabase, schoolId, startDate, endDate, [classId]),
  ]);
  if (studentError) throw new Error(`Failed to fetch class students: ${studentError.message}`);
  if (attendanceError) throw new Error(`Failed to fetch class attendance: ${attendanceError.message}`);
  const classStudents = (students ?? []) as Array<{ id: string; name: string; registration_no: string | null }>;
  const classStudentIds = new Set(classStudents.map((student) => student.id));
  const records = ((attendance ?? []) as Array<{ student_id: string; status: AttendanceStatus; attendance_date: string }>).filter((record) => classStudentIds.has(record.student_id) && rules.classWorksOn(classId, record.attendance_date) && !rules.applicableHoliday(record.attendance_date, classId, record.student_id));
  const reportStudents = classStudents.map((student) => ({ ...student, ...countStatuses(records.filter((record) => record.student_id === student.id)) }));
  return { class: schoolClass, startDate, endDate, students: reportStudents, stats: countStatuses(records) };
}

async function fetchHolidayById(supabase: SupabaseClient, schoolId: string, holidayId: string) {
  const { data, error } = await supabase.from("attendance_holidays").select("*,attendance_holiday_classes(class_id),attendance_holiday_students(student_id,students(id,name,registration_no))").eq("school_id", schoolId).eq("id", holidayId).maybeSingle();
  if (error) throw new Error(`Failed to load holiday: ${error.message}`);
  if (!data) throw new NotFoundError("Holiday not found");
  return normalizeHoliday(data as Record<string, unknown>);
}

async function validateHolidayTargets(supabase: SupabaseClient, schoolId: string, input: HolidayInput) {
  const classIds = Array.from(new Set(input.class_ids ?? []));
  const studentIds = Array.from(new Set(input.student_ids ?? []));
  if (input.scope === "classes" && !classIds.length) throw new AppError("Choose at least one class", "TARGET_REQUIRED", 400);
  if (input.scope === "students" && !studentIds.length) throw new AppError("Choose at least one student", "TARGET_REQUIRED", 400);
  if (input.scope === "classes") {
    const { count } = await supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId).in("id", classIds);
    if ((count ?? 0) !== classIds.length) throw new AppError("One or more classes are invalid", "INVALID_TARGET", 400);
  }
  if (input.scope === "students") {
    const { count } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).in("id", studentIds);
    if ((count ?? 0) !== studentIds.length) throw new AppError("One or more students are invalid", "INVALID_TARGET", 400);
  }
  return { classIds, studentIds };
}

async function replaceHolidayTargets(supabase: SupabaseClient, schoolId: string, holidayId: string, scope: AttendanceHolidayScope, classIds: string[], studentIds: string[]) {
  const [{ error: classDeleteError }, { error: studentDeleteError }] = await Promise.all([
    supabase.from("attendance_holiday_classes").delete().eq("school_id", schoolId).eq("holiday_id", holidayId),
    supabase.from("attendance_holiday_students").delete().eq("school_id", schoolId).eq("holiday_id", holidayId),
  ]);
  if (classDeleteError || studentDeleteError) throw new Error("Failed to update holiday targets");
  if (scope === "classes" && classIds.length) {
    const { error } = await supabase.from("attendance_holiday_classes").insert(classIds.map((classId) => ({ school_id: schoolId, holiday_id: holidayId, class_id: classId })) as never);
    if (error) throw new Error(`Failed to assign holiday classes: ${error.message}`);
  }
  if (scope === "students" && studentIds.length) {
    const { error } = await supabase.from("attendance_holiday_students").insert(studentIds.map((studentId) => ({ school_id: schoolId, holiday_id: holidayId, student_id: studentId })) as never);
    if (error) throw new Error(`Failed to assign holiday students: ${error.message}`);
  }
}

export async function getAttendanceHolidays(schoolId: string, startDate: string, endDate: string): Promise<AttendanceHoliday[]> {
  const supabase: SupabaseClient = createSupabaseService();
  const { data, error } = await supabase.from("attendance_holidays").select("*,attendance_holiday_classes(class_id),attendance_holiday_students(student_id,students(id,name,registration_no))").eq("school_id", schoolId).lte("holiday_date", endDate).gte("end_date", startDate).order("holiday_date");
  if (error) throw new Error(`Failed to load holidays: ${error.message}`);
  return ((data ?? []) as Array<Record<string, unknown>>).map(normalizeHoliday);
}

export async function createAttendanceHoliday(schoolId: string, input: HolidayInput): Promise<AttendanceHoliday> {
  const supabase: SupabaseClient = createSupabaseService();
  const targets = await validateHolidayTargets(supabase, schoolId, input);
  const { data, error } = await supabase.from("attendance_holidays").insert({ school_id: schoolId, holiday_date: input.holiday_date, end_date: input.end_date, title: input.title.trim(), holiday_type: input.holiday_type, scope: input.scope, note: input.note?.trim() || null } as never).select("id").single();
  if (error) throw new Error(`Failed to create holiday: ${error.message}`);
  const holidayId = String((data as Record<string, unknown>).id);
  await replaceHolidayTargets(supabase, schoolId, holidayId, input.scope, targets.classIds, targets.studentIds);
  return fetchHolidayById(supabase, schoolId, holidayId);
}

export async function updateAttendanceHoliday(schoolId: string, holidayId: string, input: HolidayInput): Promise<AttendanceHoliday> {
  const supabase: SupabaseClient = createSupabaseService();
  const targets = await validateHolidayTargets(supabase, schoolId, input);
  const { data, error } = await supabase.from("attendance_holidays").update({ holiday_date: input.holiday_date, end_date: input.end_date, title: input.title.trim(), holiday_type: input.holiday_type, scope: input.scope, note: input.note?.trim() || null } as never).eq("school_id", schoolId).eq("id", holidayId).select("id").maybeSingle();
  if (error) throw new Error(`Failed to update holiday: ${error.message}`);
  if (!data) throw new NotFoundError("Holiday not found");
  await replaceHolidayTargets(supabase, schoolId, holidayId, input.scope, targets.classIds, targets.studentIds);
  return fetchHolidayById(supabase, schoolId, holidayId);
}

export async function deleteAttendanceHoliday(schoolId: string, holidayId: string): Promise<void> {
  const supabase: SupabaseClient = createSupabaseService();
  const { error } = await supabase.from("attendance_holidays").delete().eq("school_id", schoolId).eq("id", holidayId);
  if (error) throw new Error(`Failed to delete holiday: ${error.message}`);
}
