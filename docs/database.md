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

---

## Future-Ready Tables (Schema Reserved)

These tables are **not yet created** but the foreign key relationships and naming conventions are defined so Phase 1 extensions are trivial.

| Table | FKs | Purpose |
| --- | --- | --- |
| `users` | `school_id` | Base user table for students, teachers, parents |
| `students` | `school_id`, `user_id`, `class_id`, `section_id` | Student records |
| `teachers` | `school_id`, `user_id` | Teacher records |
| `parents` | `school_id`, `user_id` | Parent/guardian records |
| `classes` | `school_id` | Grade/class definitions |
| `sections` | `school_id`, `class_id` | Class sections |
| `subjects` | `school_id` | Subject catalog |
| `class_subjects` | `school_id`, `class_id`, `subject_id` | Which subjects per class |
| `attendance` | `school_id`, `student_id`, `class_id` | Daily attendance |
| `exams` | `school_id`, `class_id` | Exam definitions |
| `grades` | `school_id`, `exam_id`, `student_id` | Exam results |
| `fee_structure` | `school_id`, `class_id` | Fee rules per class |
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

---

## Migrations

All migrations live in `supabase/migrations/` and are executed with the service role key.

```
supabase/
└── migrations/
    ├── 0001_initial_schema.sql   ✅ Applied — schools + school_admins + updated_at trigger
    ├── 0002_enable_rls.sql        ✅ Applied — RLS + storage policies
    ├── 0003_employees.sql        ✅ Applied — employees + employee_attachments tables
    └── ...
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
