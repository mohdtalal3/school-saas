import type { AttendanceDayStatus, AttendanceHoliday, ClassAttendanceReport, DailyAttendanceStudent, SchoolClass, StudentAttendanceReport, Weekday } from "@/types/school.types";
import { apiRequest, fetchClasses } from "@/features/scheduling/api";

export { apiRequest, fetchClasses };
export type DailyAttendanceData = { class: Pick<SchoolClass, "id" | "name">; date: string; dayStatus: AttendanceDayStatus; students: DailyAttendanceStudent[] };
export type AttendanceCalendarData = { holidays: AttendanceHoliday[]; weekdays: Weekday[] };

export function fetchDailyAttendance(schoolId: string, classId: string, date: string) {
  return apiRequest<DailyAttendanceData>(`/api/attendance/${schoolId}/daily?classId=${classId}&date=${date}`);
}

export function fetchStudentAttendanceReport(schoolId: string, studentId: string, startDate: string, endDate: string) {
  return apiRequest<StudentAttendanceReport>(`/api/attendance/${schoolId}/reports/student?studentId=${studentId}&startDate=${startDate}&endDate=${endDate}`);
}

export function fetchClassAttendanceReport(schoolId: string, classId: string, startDate: string, endDate: string) {
  return apiRequest<ClassAttendanceReport>(`/api/attendance/${schoolId}/reports/class?classId=${classId}&startDate=${startDate}&endDate=${endDate}`);
}

export function fetchAttendanceCalendar(schoolId: string, startDate: string, endDate: string) {
  return apiRequest<AttendanceCalendarData>(`/api/attendance/${schoolId}/calendar?startDate=${startDate}&endDate=${endDate}`);
}
