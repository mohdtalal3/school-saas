# Database

## Engine

**Supabase PostgreSQL** — hosted at `itjffvgszlvmzkpzbydh.supabase.co`

No ORM (no Prisma). All schema changes are SQL migration files in `supabase/migrations/`.

---

## Conventions

- All tables have `id` (uuid, default `gen_random_uuid()`) as primary key.
- All tables have `created_at` and `updated_at` (timestamptz, default `now()`).
- All tenant-scoped tables have `school_id` (uuid, FK → `schools.id`, ON DELETE CASCADE).
- Soft deletes: `deleted_at` (timestamptz, nullable). Hard deletes reserved for GDPR flows.
- Enums use `text` with check constraints for portability.

---

## Current Schema

### `schools`

Root multi-tenant entity. One row per school.

```sql
CREATE TABLE schools (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  tagline       TEXT,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  address       TEXT,
  country       TEXT,
  logo_url      TEXT,
  currency_symbol TEXT DEFAULT '$',
  currency_name   TEXT DEFAULT 'USD',
  timezone        TEXT DEFAULT 'UTC',
  employee_rules  TEXT,
  student_rules   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### `school_admins`

Admin users that belong to a school.

```sql
CREATE TABLE school_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_school_admin_email UNIQUE (school_id, email)
);
```

### `employees`

School staff / teachers. Full employee records with login credentials, personal info, and employment details.

```sql
CREATE TABLE employees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_code     TEXT UNIQUE,
  name              TEXT NOT NULL,
  role              TEXT NOT NULL,
  father_husband_name TEXT,
  gender            TEXT CHECK (gender IN ('male', 'female', 'other')),
  religion          TEXT,
  cnic              TEXT,
  date_of_birth     DATE,
  date_of_joining   DATE NOT NULL,
  salary            NUMERIC,
  experience        TEXT,
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  education         TEXT,
  photo_url         TEXT,
  login_username    TEXT NOT NULL UNIQUE,
  password_hash     TEXT,
  is_login_active   BOOLEAN DEFAULT false,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
```

### `employee_attachments`

Documents uploaded for employees (certificates, contracts, etc.).

```sql
CREATE TABLE employee_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  storage_key   TEXT NOT NULL,
  content_type  TEXT,
  file_size     BIGINT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### `classes`

Grade/class definitions per school. Stores name, monthly fee, class teacher, and capacity.

```sql
CREATE TABLE classes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  fee           NUMERIC(12,2) NOT NULL DEFAULT 0,
  annual_dues   NUMERIC(12,2) NOT NULL DEFAULT 0,
  class_teacher TEXT,
  capacity      INTEGER NOT NULL DEFAULT 50,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_school_class_name UNIQUE (school_id, name)
);
```

- Boys/girls counts are derived from the `students` table (Phase 2.6 — students now built; counts wired via service layer).
- Progress bar on the card view shows enrollment (boys + girls) vs `capacity`.

### `students`

Stores student records belonging to a school, with class assignment, fee discount, family info, and photo.

```sql
CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,
  registration_no TEXT,          -- auto-generated STU-0001
  name            TEXT NOT NULL,
  photo_url       TEXT,
  date_of_admission DATE NOT NULL DEFAULT CURRENT_DATE,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  mobile          TEXT,
  date_of_birth   DATE,
  gender          TEXT CHECK (gender IS NULL OR gender IN ('male','female','other')),
  identification_mark TEXT,
  blood_group     TEXT,
  disease         TEXT,
  birth_form_id   TEXT,
  additional_note TEXT,
  is_orphan       BOOLEAN NOT NULL DEFAULT false,
  is_osc          BOOLEAN NOT NULL DEFAULT false,
  is_free         BOOLEAN NOT NULL DEFAULT false,
  previous_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  annual_dues_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  previous_annual_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  religion        TEXT,
  family          TEXT,
  total_siblings  INTEGER NOT NULL DEFAULT 0,
  address         TEXT,
  father_name     TEXT,
  father_nic      TEXT,
  father_profession TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `student_attachments`

File attachments for students (birth certificate, CNIC, previous results, etc.).

```sql
CREATE TABLE student_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type   TEXT NOT NULL,
  size_bytes  BIGINT NOT NULL,
  label       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `fee_particulars`

Configurable fee line items per school. Seeded with 8 defaults on first access.

```sql
CREATE TABLE fee_particulars (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_fixed      BOOLEAN NOT NULL DEFAULT false,
  source_type   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

- **Fixed particulars** (`is_fixed = true`): amount is auto-resolved from class/student data at fee calculation time. `source_type` identifies the source field (e.g. `class.fee`, `student.previous_balance`, `student.discount`, `student.annual_dues_discount`, `class.annual_dues`).
- **Custom particulars** (`is_fixed = false`): user sets a fixed `amount`. Users can add/edit/delete these.
- **Default seed** (8 items): MONTHLY TUITION FEE (fixed), ADMISSION FEE (custom), REGISTRATION FEE (custom), FINE (custom), PREVIOUS BALANCE (fixed), DISCOUNT IN FEE (fixed), ANNUAL DUES DISCOUNT (fixed), ANNUAL DUE (fixed).
- Unique constraint on `(school_id, lower(label))`.

### `fee_invoices`

Generated fee invoices per student. Each invoice has a unique `invoice_no` (INV-00001 format, sequential per school).

```sql
CREATE TABLE fee_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_no      TEXT NOT NULL,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name    TEXT NOT NULL,
  class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,
  class_name      TEXT,
  registration_no TEXT,
  fee_month       TEXT NOT NULL,
  due_date        DATE NOT NULL,
  fine_after_due  NUMERIC(12,2) NOT NULL DEFAULT 0,
  particulars     JSONB NOT NULL DEFAULT '[]',
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'unpaid',
  father_name     TEXT,
  mobile          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

- **invoice_no**: unique per school, auto-generated as `INV-00001` (sequential).
- **particulars**: JSONB array of `{ label, amount, is_fixed, source_type }` — resolved at generation time from fee_particulars config.
- **total_amount**: calculated from particulars (discounts subtracted).
- **status**: `unpaid` | `partial` | `paid`.
- Unique constraint on `(school_id, invoice_no)`.

---

## Future-Ready Tables (Schema Reserved)

These tables are **not yet created** but the foreign key relationships and naming conventions are defined so Phase 1 extensions are trivial.

| Table | FKs | Purpose |
| --- | --- | --- |
| `teachers` | `school_id`, `user_id` | Teacher records |
| `parents` | `school_id`, `user_id` | Parent/guardian records |
| `sections` | `school_id`, `class_id` | Class sections |
| `subjects` | `school_id` | Subject catalog |
| `class_subjects` | `school_id`, `class_id`, `subject_id` | Which subjects per class |
| `attendance` | `school_id`, `student_id`, `class_id` | Daily attendance |
| `exams` | `school_id`, `class_id` | Exam definitions |
| `grades` | `school_id`, `exam_id`, `student_id` | Exam results |
| `invoices` | `school_id`, `student_id` | Fee invoices |
| `payments` | `school_id`, `invoice_id` | Payment records |
| `subscriptions` | `school_id`, `plan_id` | Subscription per school |
| `plans` | — (global) | Subscription plan definitions |

---

## Row Level Security (RLS)

RLS is **enabled on all current and future tables**.

Policies enforce that `school_id` in the row matches `school_id` in the JWT session claim.

### Pattern

```sql
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_admins ENABLE ROW LEVEL SECURITY;

-- school_admins: admins can read their own row within their school
CREATE POLICY school_admins_select ON school_admins
  FOR SELECT USING (
    (school_id::text = current_setting('app.current_school_id', true))
  );

-- school_admins: only insert allowed for registration (service role only)
CREATE POLICY school_admins_insert ON school_admins
  FOR INSERT WITH CHECK (true);
```

> **Note**: In Phase 1, service-role key bypasses RLS for admin writes. Once school admin login is implemented, scoped INSERT/UPDATE policies will be added.

---

## Storage

**Buckets:**
- `school-logos` — public read, authenticated write. School logos (Institute Profile).
- `employee-photos` — employee profile photos.
- `employee-attachments` — employee documents/certificates.
- `student-photos` — student profile photos.
- `student-attachments` — student documents (birth certificate, CNIC, results, etc.).

---

## Migrations

All migrations live in `supabase/migrations/` and are executed with the service role key.

```
supabase/
└── migrations/
    ├── 0001_initial_schema.sql         ✅ Applied — schools + school_admins + updated_at trigger
    ├── 0002_rls_and_storage.sql         ✅ Applied — RLS + storage policies + school-logos bucket
    ├── 0003_employees.sql              ✅ Applied — employees table + employee-photos bucket
    ├── 0004_rules_and_regulations.sql   ✅ Applied — employee_rules + student_rules columns on schools
    ├── 0005_employee_attachments.sql    ✅ Applied — employee_attachments table + employee-attachments bucket
    ├── 0006_classes.sql                ✅ Applied — classes table (name, fee, teacher, capacity)
    ├── 0007_students.sql               ✅ Applied — students + student_attachments tables + student-photos/student-attachments buckets
    ├── 0008_student_free_balance.sql    ✅ Applied — is_free + previous_balance columns on students
    ├── 0009_annual_dues.sql              ✅ Applied — annual_dues on classes + annual_dues_discount + previous_annual_due on students
    ├── 0010_fee_particulars.sql           ✅ Applied — fee_particulars table (label, amount, is_fixed, source_type, sort_order)
    ├── 0011_fee_invoices.sql              ✅ Applied — fee_invoices table (invoice_no, student, class, particulars JSONB, total, status)
```

Run: `npm run db:migrate`

---

## Indexes

```sql
CREATE INDEX idx_school_admins_school_id ON school_admins(school_id);
CREATE INDEX idx_school_admins_email ON school_admins(email);
CREATE INDEX idx_employees_school_id ON employees(school_id);
CREATE INDEX idx_employees_employee_code ON employees(employee_code);
CREATE INDEX idx_employees_login_username ON employees(login_username);
CREATE INDEX idx_employee_attachments_employee_id ON employee_attachments(employee_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_registration_no ON students(registration_no);
CREATE INDEX idx_student_attachments_student_id ON student_attachments(student_id);
CREATE INDEX idx_fee_particulars_school_id ON fee_particulars(school_id);
CREATE INDEX idx_fee_particulars_sort_order ON fee_particulars(school_id, sort_order);
CREATE INDEX idx_fee_invoices_school_id ON fee_invoices(school_id);
CREATE INDEX idx_fee_invoices_student_id ON fee_invoices(student_id);
CREATE INDEX idx_fee_invoices_class_id ON fee_invoices(class_id);
CREATE INDEX idx_fee_invoices_invoice_no ON fee_invoices(invoice_no);
CREATE INDEX idx_fee_invoices_fee_month ON fee_invoices(school_id, fee_month);
CREATE INDEX idx_fee_invoices_status ON fee_invoices(school_id, status);
```

---

## API Access

- Anon key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` — read-only for client-side queries (Phase 2+).
- Service role: `SUPABASE_SERVICE_ROLE_KEY` — full access, server-side only (migrations + service functions).

---

## Future Extensions

- **Soft deletes**: Add `deleted_at` to all tables and update RLS.
- **Audit log**: Create `audit_logs` table recording all mutations with actor + timestamp.
- **Full-text search**: Add `tsvector` columns on `schools.name` for search.
- **File storage**: Same Storage pattern for student photos, documents. Already in use for employee photos and attachments.
- **Rules & Regulations**: The `/api/settings/rules-regulations/[schoolId]` endpoint allows admins to GET and PATCH `employee_rules` and `student_rules` text fields on the `schools` table. These are used in job offer letters and admission letters respectively. No separate table needed — the fields are columns on `schools`.
- **Family grouping**: Students are auto-grouped into families by matching `father_nic`. The `/api/students/[schoolId]/families` endpoint queries all students with a non-empty `father_nic`, groups them, and returns only groups with 2+ siblings. No separate family table needed — the grouping is derived.
- **Student promotion**: The `/api/students/[schoolId]/promote` endpoint bulk-updates `class_id` for selected students. Only active students (`is_active = true`) are promoted; inactive ones are silently skipped. No schema change needed — promotion is a simple `class_id` update.
- **Student ID cards**: The `/api/students/id-cards/pdf` endpoint generates PDF ID cards server-side via Puppeteer. Supports three modes: all active students, filtered by class IDs (`classIds` query param), or individually selected (`ids` query param). Uses the same `IdCardTheme` type as employee ID cards. No schema change needed.
- **Searchable fields**: The `getStudents` service function accepts an optional `searchFields` parameter to restrict which columns are searched. The student ID cards tab uses `searchFields=name,registration_no` to avoid matching by father name (which may be shared across students). Other features default to searching name, registration_no, father_name, and mobile.
