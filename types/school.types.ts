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