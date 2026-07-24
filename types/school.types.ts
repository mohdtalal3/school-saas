export interface School {
  id: string;
  name: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  logo_url: string | null;
  currency_symbol: string;
  currency_name: string;
  timezone: string;
  employee_rules: string | null;
  student_rules: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  school_id: string;
  employee_code: string | null;
  name: string;
  role: string;
  father_husband_name: string | null;
  gender: "male" | "female" | "other" | null;
  religion: string | null;
  cnic: string | null;
  date_of_birth: string | null;       // "YYYY-MM-DD"
  date_of_joining: string;            // "YYYY-MM-DD"
  salary: number | null;
  experience: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  education: string | null;
  photo_url: string | null;
  login_username: string;
  password_hash?: string;             // never exposed to the client
  is_login_active: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewEmployee = Omit<Employee, "id" | "school_id" | "created_at" | "updated_at" | "employee_code" | "login_username" | "password_hash" | "is_login_active" | "is_active" | "photo_url"> & {
  photo_url?: string | null;
};
export type UpdateEmployee = Partial<Omit<Employee, "id" | "school_id" | "created_at" | "updated_at" | "employee_code" | "password_hash">>;

export interface SchoolAdmin {
  id: string;
  school_id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewSchool = Pick<School, "name"> &
  Partial<Omit<School, "id" | "name" | "created_at" | "updated_at">>;

export type UpdateSchool = Partial<Omit<School, "id" | "created_at" | "updated_at">>;

// ── Employee Attachments ─────────────────────────────────────────────────────

export interface EmployeeAttachment {
  id: string;
  employee_id: string;
  name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  label: string;
  created_at: string;
}

export interface NewEmployeeAttachment {
  name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  label: string;
}

// ── Classes ───────────────────────────────────────────────────

export interface SchoolClass {
  id: string;
  school_id: string;
  name: string;
  fee: number;
  annual_dues: number;
  class_teacher: string | null;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewClass = Omit<
  SchoolClass,
  "id" | "school_id" | "created_at" | "updated_at" | "is_active"
>;

export type UpdateClass = Partial<
  Omit<SchoolClass, "id" | "school_id" | "created_at" | "updated_at">
>;

export interface ClassWithStats extends SchoolClass {
  boys: number;
  girls: number;
  total_students: number;
}

// ── Subjects & Timetable ─────────────────────────────────────

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassSubject {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  total_marks: number;
  subject?: Subject;
  class?: Pick<SchoolClass, "id" | "name">;
  created_at: string;
  updated_at: string;
}

export interface Weekday {
  id: string;
  school_id: string;
  name: string;
  sort_order: number;
  is_weekend: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassWeekday {
  id: string;
  school_id: string;
  class_id: string;
  weekday_id: string;
  is_weekend: boolean;
  weekday?: Weekday;
  class?: Pick<SchoolClass, "id" | "name">;
  created_at: string;
}

export interface ClassPeriod {
  id: string;
  school_id: string;
  class_id: string;
  weekday_id: string;
  label: string;
  position: number;
  start_time: string;
  end_time: string;
  weekday?: Weekday;
  created_at: string;
  updated_at: string;
}

export interface TimetableEntry {
  id: string;
  school_id: string;
  class_id: string;
  class_period_id: string;
  class_subject_id: string | null;
  teacher_id: string | null;
  is_break: boolean;
  class_subject?: ClassSubject | null;
  teacher?: Pick<Employee, "id" | "name" | "employee_code" | "role"> | null;
  class?: Pick<SchoolClass, "id" | "name">;
  class_period?: ClassPeriod;
  created_at: string;
  updated_at: string;
}

// ── Students ──────────────────────────────────────────────────

export interface Student {
  id: string;
  school_id: string;
  class_id: string | null;
  registration_no: string | null;
  name: string;
  photo_url: string | null;
  date_of_admission: string;
  discount: number;
  mobile: string | null;
  date_of_birth: string | null;
  gender: string | null;
  identification_mark: string | null;
  blood_group: string | null;
  disease: string | null;
  birth_form_id: string | null;
  additional_note: string | null;
  is_orphan: boolean;
  is_osc: boolean;
  is_free: boolean;
  previous_balance: number;
  annual_dues_discount: number;
  previous_annual_due: number;
  annual_dues_original: number;
  religion: string | null;
  family: string | null;
  total_siblings: number;
  address: string | null;
  father_name: string | null;
  father_nic: string | null;
  father_profession: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewStudent = Omit<
  Student,
  "id" | "school_id" | "created_at" | "updated_at" | "is_active" | "photo_url"
> & { photo_url?: string | null; registration_no?: string | null };

export type UpdateStudent = Partial<
  Omit<Student, "id" | "school_id" | "registration_no" | "created_at" | "updated_at">
>;

export interface StudentWithClass extends Student {
  class_name: string | null;
  class_fee: number | null;
}

// ── Student Attendance ───────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "late" | "leave";
export type AttendanceDraftStatus = AttendanceStatus | "not_marked";
export type AttendanceHolidayType = "government" | "public" | "school" | "emergency" | "other";
export type AttendanceHolidayScope = "school" | "classes" | "students";

export interface AttendanceHoliday {
  id: string;
  school_id: string;
  holiday_date: string;
  end_date: string;
  title: string;
  holiday_type: AttendanceHolidayType;
  scope: AttendanceHolidayScope;
  note: string | null;
  class_ids: string[];
  students: Array<Pick<Student, "id" | "name" | "registration_no">>;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDayStatus {
  date: string;
  weekdayName: string;
  isWorkingDay: boolean;
  reason: "working_day" | "weekend" | "class_off" | "holiday";
  holiday: AttendanceHoliday | null;
}

export interface StudentAttendance {
  id: string;
  school_id: string;
  class_id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyAttendanceStudent {
  student_id: string;
  name: string;
  registration_no: string | null;
  photo_url: string | null;
  status: AttendanceDraftStatus;
  note: string;
  is_exempt: boolean;
  exemption_title: string | null;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  leave: number;
  marked: number;
  attendanceRate: number;
}

export interface StudentAttendanceReport {
  student: Pick<Student, "id" | "name" | "registration_no" | "photo_url"> & { class_name: string | null };
  startDate: string;
  endDate: string;
  records: Array<StudentAttendance & { class_name: string | null }>;
  stats: AttendanceStats;
}

export interface ClassAttendanceReport {
  class: Pick<SchoolClass, "id" | "name">;
  startDate: string;
  endDate: string;
  students: Array<Pick<Student, "id" | "name" | "registration_no"> & AttendanceStats>;
  stats: AttendanceStats;
}

// ── Student Attachments ───────────────────────────────────────

export interface StudentAttachment {
  id: string;
  student_id: string;
  name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  label: string;
  created_at: string;
}

export interface NewStudentAttachment {
  name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  label: string;
}

// ── Fee Particulars ───────────────────────────────────────────

export interface FeeParticular {
  id: string;
  school_id: string;
  label: string;
  amount: number;
  is_fixed: boolean;
  source_type: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewFeeParticular = Omit<
  FeeParticular,
  "id" | "school_id" | "created_at" | "updated_at" | "is_active" | "sort_order"
> & { sort_order?: number };

export type UpdateFeeParticular = Partial<
  Omit<FeeParticular, "id" | "school_id" | "created_at" | "updated_at">
>;

// ── Fee Invoices ──────────────────────────────────────────────

export type ParticularStatus = "unpaid" | "partial" | "paid" | "waived";

export interface InvoiceParticular {
  label: string;
  amount: number;
  paid_amount: number;
  status: ParticularStatus;
  is_fixed: boolean;
  source_type: string | null;
}

export interface FeeInvoice {
  id: string;
  school_id: string;
  invoice_no: string;
  student_id: string;
  student_name: string;
  class_id: string | null;
  class_name: string | null;
  registration_no: string | null;
  fee_month: string;
  due_date: string;
  fine_after_due: number;
  particulars: InvoiceParticular[];
  total_amount: number;
  paid_amount: number;
  waived_amount: number;
  status: "unpaid" | "partial" | "paid";
  payment_date: string | null;
  payment_note: string | null;
  father_name: string | null;
  father_nic: string | null;
  mobile: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomParticular {
  label: string;
  amount: number;
  is_fixed: boolean;
  source_type: string | null;
  add_to_balance?: boolean;
}

export interface GenerateInvoicePayload {
  mode: "class" | "student" | "all-classes";
  class_id?: string;
  student_ids?: string[];
  fee_month: string;
  due_date: string;
  fine_after_due?: number;
  custom_particulars?: CustomParticular[];
}

// ── Fee Collection / Payments ─────────────────────────────────

export interface FeeAllocation {
  label: string;
  amount: number;
}

export interface CollectFeePayload {
  invoice_id: string;
  allocations: FeeAllocation[];
  payment_note?: string;
  add_fine?: boolean;
}

export interface FeePayment {
  id: string;
  school_id: string;
  invoice_id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  note: string | null;
  particular_breakdown?: FeeAllocation[];
  created_at: string;
}
