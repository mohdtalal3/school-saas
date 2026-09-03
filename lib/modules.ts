// ── Module visibility registry ────────────────────────────────────────────────
// Canonical source of truth for toggleable sidebar modules and their subtabs.
// Keys are stored in schools.disabled_modules (JSONB string array).
// A missing key means the module/subtab is ENABLED (backward compatible).
// Dashboard and General Settings are intentionally not toggleable.

export interface ModuleTabDef {
  /** Full key, e.g. "attendance.students.daily" */
  key: string;
  /** Display label shown in Module Settings */
  label: string;
  /** The URL query param value (?tab= or ?view=) that activates this subtab */
  param: string;
}

export interface ModuleDef {
  /** Full key, e.g. "attendance.students" */
  key: string;
  /** Display label shown in Module Settings */
  label: string;
  /** Short description shown in Module Settings */
  description: string;
  /** Admin route this module guards */
  path: string;
  /** Which query param selects the subtab ("tab" | "view" | null for no-subtab modules) */
  paramKind: "tab" | "view" | null;
  tabs: ModuleTabDef[];
}

export const MODULES: ModuleDef[] = [
  {
    key: "employees",
    label: "Employees",
    description: "Staff records, logins, offer letters, attachments, and ID cards.",
    path: "/school/employees",
    paramKind: "tab",
    tabs: [
      { key: "employees.all", label: "All Employees", param: "all" },
      { key: "employees.list", label: "Basic List", param: "list" },
      { key: "employees.login", label: "Manage Login", param: "login" },
      { key: "employees.offer", label: "Job Offer Letter", param: "offer" },
      { key: "employees.attachments", label: "Attachments", param: "attachments" },
      { key: "employees.idcards", label: "ID Cards", param: "idcards" },
    ],
  },
  {
    key: "students",
    label: "Students",
    description: "Student records, letters, attachments, family, promotion, and ID cards.",
    path: "/school/students",
    paramKind: "tab",
    tabs: [
      { key: "students.all", label: "All Students", param: "all" },
      { key: "students.list", label: "Basic List", param: "list" },
      { key: "students.admission", label: "Admission Letter", param: "admission" },
      { key: "students.attachments", label: "Attachments", param: "attachments" },
      { key: "students.family", label: "Family", param: "family" },
      { key: "students.promote", label: "Promote", param: "promote" },
      { key: "students.idcards", label: "ID Cards", param: "idcards" },
    ],
  },
  {
    key: "classes",
    label: "Classes",
    description: "Class definitions with fee, annual dues, teacher, and capacity.",
    path: "/school/classes",
    paramKind: null,
    tabs: [],
  },
  {
    key: "subjects",
    label: "Subjects",
    description: "Subject catalog and per-class subject assignment.",
    path: "/school/subjects",
    paramKind: "tab",
    tabs: [
      { key: "subjects.create", label: "Create Subjects", param: "create" },
      { key: "subjects.assign", label: "Assign Subjects", param: "assign" },
    ],
  },
  {
    key: "timetable",
    label: "Timetable",
    description: "Weekdays, time periods, timetable builder, and previews.",
    path: "/school/timetable",
    paramKind: "tab",
    tabs: [
      { key: "timetable.weekdays", label: "Weekdays", param: "weekdays" },
      { key: "timetable.periods", label: "Time Periods", param: "periods" },
      { key: "timetable.create", label: "Create Timetable", param: "create" },
      { key: "timetable.preview", label: "Preview Timetable", param: "preview" },
    ],
  },
  {
    key: "fees",
    label: "Fees",
    description: "Fee particulars, invoices, collection, defaulters, and reports.",
    path: "/school/fees",
    paramKind: "tab",
    tabs: [
      { key: "fees.particulars", label: "Fee Particulars", param: "particulars" },
      { key: "fees.invoices", label: "Invoice Generator", param: "invoices" },
      { key: "fees.search", label: "Search Invoices", param: "search" },
      { key: "fees.collect", label: "Collect Fees", param: "collect" },
      { key: "fees.defaulters", label: "Fee Defaulters", param: "defaulters" },
      { key: "fees.report", label: "Fee Report", param: "report" },
    ],
  },
  {
    key: "attendance.students",
    label: "Student Attendance",
    description: "Daily class register and student/class attendance reports.",
    path: "/school/attendance",
    paramKind: "tab",
    tabs: [
      { key: "attendance.students.daily", label: "Daily Attendance", param: "students" },
      { key: "attendance.students.student-report", label: "Student Report", param: "student-report" },
      { key: "attendance.students.class-report", label: "Class Report", param: "class-report" },
    ],
  },
  {
    key: "attendance.employees",
    label: "Employee Attendance",
    description: "Employee register, calendar, schedules, reports, and imports.",
    path: "/school/attendance",
    paramKind: "view",
    tabs: [
      { key: "attendance.employees.daily", label: "Daily Attendance", param: "daily" },
      { key: "attendance.employees.calendar", label: "Calendar", param: "calendar" },
      { key: "attendance.employees.settings", label: "Settings", param: "settings" },
      { key: "attendance.employees.monthly", label: "Monthly Report", param: "monthly" },
      { key: "attendance.employees.detail", label: "Employee Report", param: "detail" },
      { key: "attendance.employees.imports", label: "Import History", param: "imports" },
    ],
  },
];

export const ALL_MODULE_KEYS: string[] = MODULES.flatMap((m) => [
  m.key,
  ...m.tabs.map((t) => t.key),
]);

export function isModuleKey(key: string): boolean {
  return ALL_MODULE_KEYS.includes(key);
}

/** True when the module (parent) key is disabled. */
export function isModuleDisabled(
  disabledModules: string[] | null | undefined,
  moduleKey: string
): boolean {
  return (disabledModules ?? []).includes(moduleKey);
}

/**
 * True when a subtab is disabled. A disabled parent blocks every child
 * regardless of the child's own state.
 */
export function isTabDisabled(
  disabledModules: string[] | null | undefined,
  moduleKey: string,
  tabKey: string
): boolean {
  const disabled = disabledModules ?? [];
  return disabled.includes(moduleKey) || disabled.includes(tabKey);
}
