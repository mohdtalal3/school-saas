# Project Context — School ERP SaaS

> **Onboarding doc.** Read this top to bottom and you know everything about the project's current state, decisions, conventions, and what's left to build. Keep it updated as work progresses.
>
> Companion files: `MEMORY.md` (project memory index), `docs/architecture.md`, `docs/database.md`, `docs/roadmap.md`.

---

## 1. What this is

A production-grade, **multi-tenant School ERP SaaS** — one Postgres database shared by many schools, every tenant row scoped by `school_id` with Row Level Security. UX/UI inspired by eSkooly (visual inspiration only — **no code or asset copying**; all original code and illustrations).

Single Next.js codebase hosts both the UI (App Router) and the backend (API Route Handlers). **No separate backend service, no Prisma** — raw SQL migrations + Supabase JS SDK only.

### Current phase: Phase 2 (IN PROGRESS — Employee module + PDF generation complete)

Built and working:
- Master login (env-credential, **hidden endpoint**) + Master dashboard + Create-school flow
- Premium school-admin login UI (`/school-login`)
- Admin portal: dashboard + sidebar/topbar layout + Institute Profile (with logo upload) + Account Settings (currency/timezone) + Logout
- Multi-tenant DB schema + RLS + Storage bucket (migrations written)
- **Employee management** — full CRUD, list with search/filter, detail page, photo upload, attachments, active/inactive toggle
- **ID Card generation** — Puppeteer-based, CR80 portrait (53.98mm × 85.6mm), premium design with navy/gold theme, logo watermark, gold-ring photo, STAFF ID badge in header, 6 cards per A4 page, theme customization (accent/gold/text/bg colors), iframe preview + download, All/Select mode with server-side search
- **Student ID Cards** — Same Puppeteer PDF design as employee ID cards, STUDENT ID badge, student-specific fields (Reg No, Class, Father, Mobile, DOB, Blood Group), All mode with class multi-select / Select mode with server-side search (name & reg no only), theme customization, iframe preview + download
- **Job Offer Letter** — `@react-pdf/renderer` based, premium template with navy/gold color scheme matching ID cards, school logo watermark (centered, fixed overlay), 2-page letter (particulars + terms), signature blocks, bottom accent strip
- **Classes** — full CRUD (create, list, edit, delete), card grid view with boys/girls counts, enrollment progress bar, class name + fee + annual_dues + class teacher + capacity fields, empty state prompting to create first class
- **Students** — full CRUD (create, list, edit, delete, view), card grid view with photo/class/fee, class dropdown with fee display, auto-generated registration no, photo upload, student attachments (birth cert, CNIC, results), search by name/reg no/father/mobile, filter by class, view details dialog with all fields, Excel bulk import (styled template with Instructions sheet), family grouping (auto-group by father CNIC), promote students (bulk class update), student ID cards

Not yet built (Phase 2/3):
- Teacher / Parent / Student portals (role cards exist in the login UI but show a "coming soon" toast)
- Attendance, Exams, Fees, Teachers/Parents CRUD
- Subscription billing, notifications, reports, i18n, RBAC

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + CSS variables for theming |
| UI primitives | shadcn-style components built on Radix (`components/ui/*`) |
| Animation | Framer Motion |
| Icons | Lucide React |
| Forms | React Hook Form + Zod (`@hookform/resolvers/zod`) |
| Data fetching | TanStack Query (`@tanstack/react-query`) |
| DB | Supabase Postgres (JS SDK, **no Prisma**) |
| Storage | Supabase Storage (bucket `school-logos`, public read) |
| Auth | Custom JWT in HTTP-only cookies (`jose`) — **not** Supabase Auth |
| Password hashing | bcryptjs (10 rounds) |
| IDs / slugs | nanoid |
| PDF generation (ID cards) | Puppeteer (headless Chrome → HTML/CSS → PDF) |
| PDF generation (offer letters) | `@react-pdf/renderer` (React → PDF) |
| Migrations | Raw SQL files in `supabase/migrations/`, run via `npm run db:migrate` (tsx) |

Key dependencies are pinned in `package.json`. Scripts: `dev`, `build`, `start`, `lint`, `db:migrate`.

**PDF generation note:** Two different PDF libraries are in use:
- **Puppeteer** — used for ID cards (`app/api/employees/id-cards/pdf/route.ts`). Generates HTML server-side, renders via headless Chrome. Supports complex CSS (gradients, shadows, web fonts) that `@react-pdf/renderer` cannot.
- **`@react-pdf/renderer`** — used for Job Offer Letters (`features/employees/job-offer-letter-pdf.tsx`). React-based PDF generation, good for multi-page text-heavy documents.
- `next.config.js` has `transpilePackages: ["@react-pdf/renderer"]` for compatibility.

Fonts: **Inter** loaded via `next/font/google` with CSS variable `--font-sans` (set in `app/layout.tsx`).

---

## 3. Environment & credentials

`.env` (project root) — **currently committed for Phase 1 dev only; move to a secrets manager before production.**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MASTER_EMAIL=
MASTER_PASSWORD=
NEXT_PUBLIC_APP_URL=http://localhost:3000
# JWT_SECRET — optional; lib/env.ts has a long default (change in prod)
```

All env access goes through `lib/env.ts` (Zod-validated). `.env.example` documents the shape.

- **Master login** uses `MASTER_EMAIL` / `MASTER_PASSWORD` directly (Phase 1 only — move to a hashed DB row before scaling).
- **Service role key** bypasses RLS — used only by migration runner and trusted service functions (`supabaseService()`), never shipped to the browser.
- **Anon key** is public-safe, used by the browser client (`supabaseBrowser()`).

---

## 4. How to run

```bash
npm install
npm run db:migrate   # applies supabase/migrations/*.sql via service role key
npm run dev          # http://localhost:3000
```

### Migration runner notes (`supabase/migrate.ts`)
- Reads `.env` from project root itself (no dotenv dependency), then checks `process.env`.
- Reads SQL files from `supabase/migrations/` (NOT the script's own dir — this was a bug, now fixed).
- Tries a Postgres `exec_sql(text)` RPC first; falls back to per-statement execution. **If `exec_sql` doesn't exist in your Supabase project, create it once** (SQL Editor):
  ```sql
  CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE query; END; $$;
  ```
  then re-run `npm run db:migrate`.
- **Status as of last session:** migrations were written but their successful application was not confirmed end-to-end (network from the dev sandbox to Supabase was blocked). **Verify tables `schools` and `school_admins` exist in the Supabase dashboard before relying on login.**

### URL map

| URL | Purpose |
| --- | --- |
| `/` | Root redirect. If master session → `/master`; if admin session → `/school`; else → `/school-login` |
| `/school-login` | **Public entry.** Premium two-panel admin login. Admin role is functional; Employee/Student show "coming soon" toast. |
| `/school` | Admin portal (guarded by `school_session` cookie, role `admin`) |
| `/school/settings` | Redirects to `/school/settings/institute-profile` |
| `/school/settings/institute-profile` | Institute profile form + logo upload |
| `/school/settings/account-settings` | Currency + timezone |
| `/school/settings/rules-regulations` | Employee & student rules text (used in offer/admission letters) |
| `/school/employees` | Employee management — tabs: All Employees, Basic List, Manage Login, Job Offer, Attachments, ID Cards |
| `/school/employees/[employeeId]` | Employee detail page (profile, attachments, actions) |
| `/school/employees/id-cards` | ID card generation — All/Select mode, server-side search, customize theme, preview PDF in iframe, download |
| `/school/employees/offer-letter/[employeeId]` | Job offer letter PDF viewer (full-screen) |
| `/school/classes` | Classes management — card grid, create/edit/delete, boys/girls counts, progress bar |
| `/school/students` | Student management — tabs: All Students, Basic List, Admission Letter, Attachments, Family, Promote, ID Cards |
| `/school/students/admission-letter/[studentId]` | Admission letter PDF viewer (full-screen) |
| `/master-login` | **Hidden** — type URL directly. Master super-admin login (creates/manages schools). Not linked anywhere in the UI. |
| `/master` | Master dashboard |
| `/master/create-school` | Create school + first admin |

---

## 5. Architecture overview

See `docs/architecture.md` for full details on layers, multi-tenancy model, auth flows, PDF generation, data loading, search patterns, and layout conventions.

Key points:
- Single Next.js 15 App Router app — UI + API route handlers in one codebase.
- Multi-tenancy: `school_id` FK + RLS on every tenant table; `schoolId` derived from JWT session, never client input.
- Auth: custom JWT in HTTP-only cookies (`jose`) — master (env creds) + school admin (bcrypt, `school_admins` table).
- Service layer (`services/*.service.ts`) holds all business logic; route handlers are thin wrappers.
- PDF: Puppeteer for ID cards (complex CSS), `@react-pdf/renderer` for letters (multi-page text).

### Standardized API responses (`lib/api-response.ts`)
```ts
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string; code?: string };
// AppError / NotFoundError / UnauthorizedError / ForbiddenError — each carries statusCode
```
Every route returns this shape; errors thrown in services are converted to `{ success: false, error }` with the right status.

---

## 6. File map (current)

```
app/
├── layout.tsx                      Root layout: Inter font, <Providers>
├── page.tsx                         Root redirect (→ /school-login if no session)
├── globals.css                      Design tokens (brand purple) + utilities (.login-gradient, .hero-mesh, .glass)
│
├── (auth)/
│   ├── master-login/page.tsx        Master login page (uses features/master/master-login-form)
│   └── school-login/page.tsx         ★ Premium login — renders <LoginCard/>
│
├── (master)/
│   ├── layout.tsx                   Master layout (auth guard for role=master)
│   └── master/
│       ├── page.tsx                  Master dashboard (schools list)
│       └── create-school/page.tsx    Create-school form
│
├── (admin)/
│   ├── layout.tsx                   Admin layout: validates school_session, prefetches school, wraps <AdminShell>
│   └── school/
│       ├── page.tsx                  Admin dashboard
│       └── settings/
│           ├── layout.tsx           Settings header ("General Settings")
│           ├── page.tsx             redirect → institute-profile
│           ├── institute-profile/page.tsx
│           ├── account-settings/page.tsx
│           └── rules-regulations/page.tsx   Employee & student rules text editor
│
└── api/
    ├── auth/{master-login,school-login,logout}/route.ts
    ├── schools/route.ts                      GET list, POST create (master only)
    ├── schools/[schoolId]/route.ts          GET/PATCH/DELETE (master only)
    ├── settings/
    │   ├── institute-profile/[schoolId]/route.ts       GET/PATCH (admin of that school)
    │   ├── institute-profile/[schoolId]/logo/route.ts  POST FormData → Supabase Storage
    │   ├── account-settings/[schoolId]/route.ts         GET/PATCH currency/timezone
    │   └── rules-regulations/[schoolId]/route.ts        GET/PATCH employee_rules + student_rules
    ├── employees/
    │   ├── [schoolId]/route.ts                          GET list, POST create
    │   ├── [schoolId]/[employeeId]/route.ts             GET, PATCH, DELETE
    │   ├── [schoolId]/[employeeId]/photo/route.ts       POST FormData → Supabase Storage
    │   ├── [schoolId]/[employeeId]/attachments/route.ts GET, POST attachments
    │   ├── [schoolId]/[employeeId]/attachments/[attachmentId]/route.ts       DELETE attachment
    │   ├── [schoolId]/[employeeId]/attachments/[attachmentId]/download/route.ts  GET download
    │   ├── [schoolId]/job-offer/[employeeId]/route.ts   GET — Job Offer Letter PDF
    │   └── id-cards/pdf/route.ts                        GET — Puppeteer ID Card PDF generation
    ├── classes/
    │   ├── [schoolId]/route.ts                          GET list, POST create
    │   └── [schoolId]/[classId]/route.ts                GET, PATCH, DELETE
    ├── students/
    │   ├── [schoolId]/route.ts                          GET list (search, classId, active, isFree, searchFields), POST create
    │   ├── [schoolId]/[studentId]/route.ts             GET, PATCH, DELETE
    │   ├── [schoolId]/[studentId]/photo/route.ts        POST FormData → Supabase Storage
    │   ├── [schoolId]/[studentId]/attachments/route.ts  GET, POST attachments
    │   ├── [schoolId]/[studentId]/attachments/[attachmentId]/route.ts        DELETE attachment
    │   ├── [schoolId]/[studentId]/attachments/[attachmentId]/download/route.ts  GET download
    │   ├── [schoolId]/import/route.ts                   POST — Excel bulk import (.xlsx)
    │   ├── [schoolId]/families/route.ts                 GET — family grouping by father_nic
    │   ├── [schoolId]/promote/route.ts                  POST — bulk promote students to target class
    │   └── id-cards/pdf/route.ts                        GET — Puppeteer Student ID Card PDF generation

components/
├── providers.tsx            QueryClientProvider + ToastProvider (root)
├── layout/
│   ├── admin-shell.tsx       Client context provider (school, sidebar state, logout) + layout
│   ├── admin-sidebar.tsx     ★ Collapsible sidebar groups (Students, Employees, Settings); tab-based sub-items; mobile overlay
│   └── admin-topbar.tsx      Breadcrumb + school badge + admin avatar + mobile menu button
├── layout/master-navbar.tsx
└── ui/                       button, input, label, select, card, avatar, dropdown-menu, textarea, separator, toast,
                                dialog, tabs, pagination, directory-table, search-picker, letter-search-tab

features/
├── auth/
│   ├── login/                ★ Premium login UI (see §7)
│   └── school-login-form.tsx (OLD — superseded by login/, kept but unused)
├── admin/dashboard.tsx
├── master/{master-login-form,create-school-form,schools-list}.tsx
├── settings/{institute-profile-form,account-settings-form,rules-regulations-form}.tsx
├── employees/
│   ├── employee-form.tsx          Add/edit employee form (RHF + Zod)
│   ├── employee-management.tsx    Main page — tabs: All, Basic List, Manage Login, Job Offer, Attachments, ID Cards
│   ├── employee-directory-tab.tsx Basic List tab — paginated table with Excel export
│   ├── employee-view-dialog.tsx  View employee details dialog
│   ├── attachments-tab.tsx       Attachments tab — left panel list, right panel upload/download/delete
│   ├── employee-attachments-form.tsx  Attachment form
│   ├── manage-login-tab.tsx      Manage employee login credentials (username, password, active toggle)
│   ├── id-cards-tab.tsx          Thin wrapper — passes schoolId to IdCardsClient
│   ├── id-cards-client.tsx       ID card UI — All/Select mode, server-side search, theme picker, iframe preview, download
│   ├── id-card-types.ts          IdCardTheme interface + DEFAULT_ID_CARD_THEME (shared with student ID cards)
│   ├── id-card-html.ts           HTML template for Puppeteer PDF (CR80 portrait, premium design)
│   ├── job-offer-letter-pdf.tsx  @react-pdf/renderer Job Offer Letter document
│   ├── job-offer-pdf-viewer.tsx  Client-side PDFViewer wrapper for offer letter
│   └── job-offer-tab.tsx         Tab component to launch offer letter viewer
│
├── classes/
│   ├── class-form.tsx             Add/edit class form (RHF + Zod — name, fee, annual_dues, teacher, capacity)
│   └── class-management.tsx       Card grid with boys/girls counts, progress bar, edit/delete
│
├── students/
│   ├── student-form.tsx           Add/edit student form (RHF + Zod — all student fields, class dropdown)
│   ├── student-management.tsx     Main page — tabs: All, Basic List, Admission Letter, Attachments, Family, Promote, ID Cards
│   ├── student-directory-tab.tsx  Basic List tab — paginated table with Excel export
│   ├── import-students-dialog.tsx Excel bulk import dialog — class select, file upload, styled sample Excel template (2 sheets: Students + Instructions)
│   ├── admission-letter-tab.tsx   Admission letter generation tab (SearchPicker → navigate to PDF viewer)
│   ├── admission-letter-pdf.tsx   @react-pdf/renderer Admission Letter document
│   ├── admission-letter-pdf-viewer.tsx  Client-side PDFViewer wrapper
│   ├── family-tab.tsx             Family grouping tab — auto-groups by father CNIC, search, expandable cards
│   ├── promote-tab.tsx            Promote students tab — table with checkboxes, class filter, search, bulk promote
│   ├── student-id-cards-tab.tsx   Student ID card UI — All mode (class multi-select) / Select mode (server-side search), theme, preview
│   └── student-id-card-html.ts    HTML template for student ID cards (same CR80 layout, student fields)

lib/
├── env.ts                    Zod-validated env access
├── api-response.ts           ApiResponse type + AppError classes
├── auth/jwt.ts               create/get/set/clear master + school sessions
├── utils.ts                  cn() (clsx+twMerge), formatDate, slugify, getInitials
└── supabase/                 index, supabase-browser, supabase-server, supabase-service

services/                     (business logic; no JSX)
├── auth.service.ts           verifyMasterCredentials, hashPassword, createSchoolAdmin, verifyAdminPassword, requireAdminById
├── school.service.ts         getAllSchools, getSchoolById, createSchool, updateSchool, deleteSchool
├── settings.service.ts        getInstituteProfile, updateInstituteProfile, uploadSchoolLogo, getAccountSettings, updateAccountSettings
├── employee.service.ts       getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee
├── class.service.ts          getClasses, getClassById, createClass, updateClass, deleteClass
└── student.service.ts        getStudents (with searchFields), getStudentById, createStudent, updateStudent, deleteStudent,
                                getStudentAttachments, uploadStudentAttachment, deleteStudentAttachment,
                                uploadStudentPhoto, importStudents, getFamilies, promoteStudents

types/
├── school.types.ts           School, SchoolAdmin, Employee, NewEmployee, UpdateEmployee, NewSchool, UpdateSchool,
                                SchoolClass, NewClass, UpdateClass, ClassWithStats, Student, NewStudent, UpdateStudent,
                                StudentWithClass, StudentAttachment
└── api.types.ts

supabase/
├── migrate.ts                Migration runner (reads .env, reads migrations/, tries exec_sql RPC)
└── migrations/
    ├── 0001_initial_schema.sql       schools + school_admins + updated_at trigger
    ├── 0002_rls_and_storage.sql       enable RLS, public-read policies, create school-logos bucket
    ├── 0003_employees.sql            employees + employee_attachments tables
    ├── 0006_classes.sql              classes table (name, fee, teacher, capacity)
    ├── 0007_students.sql             students + student_attachments tables + storage buckets
    ├── 0008_student_free_balance.sql  is_free + previous_balance columns on students
    ├── 0009_annual_dues.sql            annual_dues on classes + annual_dues_discount + previous_annual_due on students
    └── ...
```

---

## 7. Premium login UI (`features/auth/login/`)

Built to a detailed spec (two-panel, lavender form left / dark-purple hero right). Components:

| File | Role |
| --- | --- |
| `login-card.tsx` | 1280×830 rounded container; grid `42/58` desktop → `45/55` tablet → single column mobile (hero hidden) |
| `login-form.tsx` | RHF + Zod + TanStack mutation → `POST /api/auth/school-login`; logo block, "Welcome Back!", role selector, email/password, remember switch, gradient Login button, forgot link |
| `role-selector.tsx` | 3 circular cards (Admin/Employee/Student) with spring selection anim. Admin=enabled; others show "coming soon" toast + "SOON" badge |
| `password-input.tsx` | 56px input, lock icon left, eye toggle right, purple focus glow |
| `remember-switch.tsx` | Custom switch (not a checkbox) |
| `hero-section.tsx` | Dark-purple right panel; "Sign Up" button (toast), "Continue Managing!" heading, illustration + decorations |
| `hero-illustration.tsx` | Hand-authored SVG: graduation-cap student at laptop with dashboard chart (gray + purple) |
| `floating-decorations.tsx` | Floating password-field card, shield, database, lock, cursor, glow orbs, animated dashed connection lines |
| `animated-background.tsx` | Drifting gradient blobs behind hero |

### Design tokens (in `globals.css` + `tailwind.config.ts`)
- `--primary: 250 100% 64%` → `#6D4AFF` (brand purple; also drives the admin portal)
- `--brand-dark: 252 63% 24%` → `#2B1766` (hero panel)
- `--brand-light: 246 84% 95%` → `#EEEAFD` (form panel)
- Tailwind `brand` color object: `brand` (DEFAULT), `brand.dark`, `brand.light`
- Utilities: `.login-gradient` (135deg `#7b61ff → #6d4aff`), `.hero-mesh` (radial gradients on `#2b1766`), `.glass`
- `cn()` uses `tailwind-merge` → class overrides (`h-14` over base `h-10`) resolve correctly.

### Role honesty
Only Admin has a backend. Employee/Student, Sign Up, and Forgot-password show informational toasts rather than dead links — no fabricated auth flows.

---

## 8. Admin portal specifics

- **`app/(admin)/layout.tsx`** is a Server Component: validates `school_session` (role `admin`), prefetches the school record, renders `<AdminShell schoolId initialSchool>`. Unauthenticated → redirect `/school-login`.
- **`AdminShell`** (`components/layout/admin-shell.tsx`) is a client context provider: `school`, `sidebarOpen`, `setSidebarOpen`, `logout`. `useAdminShell()` is the hook features consume (e.g. settings forms read `school` for `initialData`).
- **Sidebar** (`admin-sidebar.tsx`): dark theme, mobile overlay (AnimatePresence), active-link highlight, and **collapsible groups** for Students, Employees, and Settings. Each group has tab-based sub-items that navigate via `?tab=` URL params (e.g., `/school/students?tab=family`). Groups auto-expand when on the parent page. Active sub-item highlighted via `useSearchParams`.
- **Topbar** (`admin-topbar.tsx`): breadcrumb + school badge (logo) + admin avatar + mobile menu button.

---

## 9. Database schema (current)

### `schools` (root tenant entity, one row per school)
`id` (uuid pk, gen_random_uuid), `name`, `tagline`, `phone`, `email`, `website`, `address`, `country`, `logo_url`, `currency_symbol` (default `$`), `currency_name` (default `USD`), `timezone` (default `UTC`), `employee_rules` (text, nullable — used in job offer letters), `student_rules` (text, nullable — used in admission letters), `created_at`, `updated_at` (trigger-updated).

### `school_admins`
`id` (uuid pk), `school_id` (fk → schools, ON DELETE CASCADE), `name`, `email`, `password_hash` (bcrypt), `is_active` (bool), `created_at`, `updated_at`; unique `(school_id, email)`.

### `employees`
`id` (uuid pk), `school_id` (fk → schools, ON DELETE CASCADE), `employee_code` (auto-generated, unique per school), `name`, `role` (designation), `father_husband_name`, `gender` (male/female/other), `religion`, `cnic`, `date_of_birth`, `date_of_joining`, `salary` (numeric), `experience`, `phone`, `email`, `address`, `education`, `photo_url`, `login_username` (auto-generated), `password_hash` (bcrypt), `is_login_active` (bool), `is_active` (bool), `created_at`, `updated_at`.

### `employee_attachments`
Attachments uploaded for employees (documents, certificates, etc.). Stored in Supabase Storage bucket `employee-attachments`.

### `classes`
`id` (uuid pk), `school_id` (fk → schools, ON DELETE CASCADE), `name` (text), `fee` (numeric, default 0), `annual_dues` (numeric, default 0), `class_teacher` (text, nullable), `capacity` (int, default 50), `is_active` (bool, default true), `created_at`, `updated_at`. Unique constraint on `(school_id, name)`. Boys/girls counts derived from `students` table.

### `students`
`id` (uuid pk), `school_id` (fk → schools, ON DELETE CASCADE), `class_id` (fk → classes, ON DELETE SET NULL), `registration_no` (auto STU-0001), `name`, `photo_url`, `date_of_admission` (default CURRENT_DATE), `discount` (numeric, default 0), `mobile`, `date_of_birth`, `gender` (male/female/other), `identification_mark`, `blood_group`, `disease`, `birth_form_id`, `additional_note`, `is_orphan` (bool), `is_osc` (bool), `is_free` (bool, default false), `previous_balance` (numeric, default 0), `annual_dues_discount` (numeric, default 0), `previous_annual_due` (numeric, default 0), `religion`, `family`, `total_siblings` (int, default 0), `address`, `father_name`, `father_nic`, `father_profession`, `is_active` (bool, default true), `created_at`, `updated_at`.

### `student_attachments`
Documents uploaded for students (birth certificate, CNIC/B-Form, previous result, medical, etc.). Stored in Supabase Storage bucket `student-attachments`.

### RLS
Enabled on all tables. Public-read policies + service-role bypass for trusted writes. Policies will tighten once school-admin login RBAC lands.

### Storage
Bucket `school-logos` — public read, authenticated write. Logo upload goes through the service-role API route (`/api/settings/institute-profile/[schoolId]/logo`): validates 500KB / JPG/PNG, uploads, updates `schools.logo_url`.
Bucket `employee-photos` — for employee profile photos.
Bucket `employee-attachments` — for employee documents/certificates.
Bucket `student-photos` — for student profile photos.
Bucket `student-attachments` — for student documents (birth cert, CNIC, results, etc.).

### Reserved (schema-ready, not built)
teachers, parents, sections, subjects, attendance, exams, grades, fee_structure, invoices, payments, subscriptions, plans — all FK-linked to `school_id`.

See `docs/database.md` for full DDL and `docs/roadmap.md` for the build order.

---

## 10. Conventions

- TypeScript **strict** — avoid `any`. (Note: a few pre-existing implicit-`any` errors exist in `lib/supabase/supabase-server.ts` and `services/*` — see §11.)
- Files: kebab-case for non-components; PascalCase component filenames.
- Services: `*.service.ts`, pure functions, throw `AppError` subclasses, no JSX.
- Route handlers: thin — validate (Zod) → auth (JWT) → call service → return `success(data)` / `error(msg)`.
- Forms: RHF + Zod resolver; mutations via TanStack Query; optimistic cache patch with `qc.setQueryData` + `router.refresh()` to revalidate RSC.
- Styling: Tailwind via `cn()`. No inline styles. Theming through CSS variables.
- All env via `lib/env.ts`. All API responses via `lib/api-response.ts`.
- Comments explain *why*, not *what*.

### Search & Layout Conventions

See `docs/architecture.md` §Search Pattern Consistency and §Page Container & Layout Conventions for full details.

- All search is server-side with 300ms debounce.
- `useServerPagination` hook manages page/pageSize/search.
- `searchFields` param (students) restricts searched columns.
- Two UI patterns: `DirectoryTable` (table header search) and `SearchPicker` (standalone dropdown).
- Page root: `space-y-6`. Forms: `space-y-5` with `grid gap-4 sm:grid-cols-2`. Dialogs: `sm:max-w-md` / `sm:max-w-2xl`.

---

## 11. Known issues & technical debt

- **DB migrations not verified applied.** Run `npm run db:migrate` and confirm `schools` + `school_admins` exist in Supabase before testing login. If `exec_sql` RPC is missing, create it (see §4) then re-run.
- **Pre-existing TypeScript errors** (not introduced by recent UI work, don't block `next dev`, but will fail `next build` until fixed):
  - `components/layout/admin-sidebar.tsx` — *fixed* (removed unused `parent` field).
  - `lib/auth/jwt.ts:30` — JWT payload cast to `Record<string, unknown>` type overlap.
  - `lib/supabase/supabase-server.ts` — implicit `any` on `@supabase/ssr` cookie callback params.
  - `services/auth.service.ts` / `services/school.service.ts` — Supabase generic types infer as `never[]` (missing `Database` generic on the service client). Fix: generate/ pass a typed `Database` interface to `createClient<Database>`.
  - `supabase/migrate.ts` — `supabase.rpc("exec_sql", …)` typing; harmless at runtime.
  - These are the next cleanup pass before `next build` will succeed.
- **ESLint not configured** (`eslint.config.js` missing; ESLint 9 needs the flat config). `next lint` is also deprecated. Set up flat-config ESLint when convenient.
- `features/auth/school-login-form.tsx` is **dead code** (superseded by `features/auth/login/`). Safe to delete.
- `.env` committed with live keys for Phase 1 — rotate + move to a secrets manager before any real deployment.
- Master login is env-based (Phase 1 only) — must become a hashed DB row before scaling.
- `Remember me` switch is UI-only right now (the endpoint accepts the flag but doesn't change cookie maxAge yet).
- "Forgot password" and "Sign Up" are toast-only (no flows built).

---

## 12. Employee Module & PDF Generation

### Employee Management (`features/employees/`)
- Full CRUD: create, read, update, delete employees scoped to `school_id`
- **Tab-based UI** (`employee-management.tsx`): All Employees (card grid), Basic List (DirectoryTable), Manage Login, Job Offer, Attachments, ID Cards
- Card grid with search, role filter, active/inactive filter, pagination
- Detail page with tabs: profile info, attachments
- Photo upload via Supabase Storage
- Attachment upload/download/delete (attachments tab with left panel list + right panel)
- Active/inactive toggle
- Auto-generated `employee_code` and `login_username`
- Manage Login tab: update username, reset password, toggle login active status

### ID Card Generation (Puppeteer-based)
- **Employee Route:** `app/api/employees/id-cards/pdf/route.ts` — GET request, returns PDF buffer
- **Student Route:** `app/api/students/id-cards/pdf/route.ts` — same Puppeteer flow, student-specific fields
- **Employee Template:** `features/employees/id-card-html.ts` — builds HTML string with CSS
- **Student Template:** `features/students/student-id-card-html.ts` — same CSS/layout, student fields (Reg No, Class, Father, Mobile, DOB, Blood)
- **Client (Employee):** `features/employees/id-cards-client.tsx` — All/Select mode, server-side search, theme customization, iframe preview, download
- **Client (Student):** `features/students/student-id-cards-tab.tsx` — All mode with class multi-select / Select mode with server-side search, theme customization, iframe preview, download
- **Types:** `features/employees/id-card-types.ts` — `IdCardTheme` interface + `DEFAULT_ID_CARD_THEME` (shared by both)
- **Card size:** CR80 portrait (53.98mm × 85.6mm), 6 cards per A4 page (2 cols × 3 rows)
- **Design:** Navy gradient header with gold underline, circular logo overlapping header, badge in header (STAFF ID / STUDENT ID), school name + tagline, gold-ring circular photo, name, info rows, navy footer with school phone + address, logo watermark
- **Theme:** Customizable accent color, gold color, text color, bg color. Default: `#243c8b` accent, `#c89a2b` gold, `#1f2937` text, `#ffffff` bg
- **Selection modes:** All (optionally filtered by class for students) / Select (server-side search, add individually). PDF endpoint receives `ids` or `classIds` query params and fetches only what's needed.
- **Student search restriction:** Uses `searchFields=name,registration_no` to avoid matching by father name
- **Scaling:** All px values scaled from 340px reference design to mm via `SCALE = CARD_W_MM / 340`
- **Removed files:** `id-card-pdf.tsx` and `id-card-pdf-viewer.tsx` (old `@react-pdf/renderer` implementation, replaced by Puppeteer)

### Job Offer Letter (`@react-pdf/renderer`-based)
- **Template:** `features/employees/job-offer-letter-pdf.tsx` — React-based PDF document
- **Viewer:** `features/employees/job-offer-pdf-viewer.tsx` — client-side `PDFViewer` wrapper
- **Page:** `app/(admin)/school/employees/offer-letter/[employeeId]/page.tsx` — full-screen PDF viewer
- **Design:** Navy/gold color scheme matching ID cards (`#243c8b` navy, `#c89a2b` gold), top accent strip (navy + gold), header with logo + school info, divider with gold dot, meta band (reference + date), title block, salutation, body paragraphs, employee particulars grid (2-column), terms of employment (numbered list), rules & regulations, acceptance callout, signature blocks, bottom navy strip with gold top line
- **Watermark:** School logo as centered, fixed overlay (opacity 0.06, `marginTop: -150` for vertical centering)
- **Layout:** 2 pages — page 1: header + particulars, page 2: terms + signatures

---

## 13. Classes Module

### Class Management (`features/classes/`)
- Full CRUD: create, list, edit, delete classes scoped to `school_id`
- Card grid view with class name, fee, class teacher, capacity
- Boys/girls counts displayed per card (derived from students table — students module now built, counts wired via service layer)
- Enrollment progress bar (boys + girls vs capacity) with color coding: primary (under 70%), amber (70-90%), destructive (90%+)
- Empty state with illustration prompting to create first class
- Form fields: class name (required), monthly fee (required), class teacher (optional), capacity (optional, default 50)
- Soft delete (sets `is_active = false`)
- Unique constraint on `(school_id, name)` — no duplicate class names per school

### API Routes
- `GET /api/classes/[schoolId]` — list all active classes
- `POST /api/classes/[schoolId]` — create new class
- `GET /api/classes/[schoolId]/[classId]` — get single class
- `PATCH /api/classes/[schoolId]/[classId]` — update class
- `DELETE /api/classes/[schoolId]/[classId]` — soft delete class

---

## 14. Students Module

### Student Management (`features/students/`)
- Full CRUD: create, list, edit, delete, view students scoped to `school_id`
- Card grid view with photo, name, registration no, class chip, net fee, gender, mobile, father name
- Auto-generated registration number (`STU-0001`)
- Class dropdown loads from classes API — shows fee per class, calculates net fee (class fee − discount) live
- Photo upload via Supabase Storage (`student-photos` bucket) — JPG/PNG, max 500KB
- Student attachments (`student-attachments` bucket) — birth certificate, CNIC/B-Form, previous result, medical, etc. (PDF/DOC/JPG/PNG, max 10MB)
- Attachments tab: left panel student list with search, right panel attachments with upload/download/delete
- Search by name, registration no, father name, mobile (configurable via `searchFields` param)
- Filter by class (dropdown), filter by free education status
- View details dialog showing all student fields in a grid
- Soft delete (sets `is_active = false`)
- Form fields: name, photo, class, date of admission, discount, mobile, DOB, gender, blood group, identification mark, disease, birth form ID, additional note, orphan, OSC, is_free, previous_balance, annual_dues_discount, previous_annual_due, religion, family, total siblings, address, father name, father NIC, father profession

### Student Tabs (sidebar sub-items, URL `?tab=`)
- **All Students** (`all`) — card grid with search, class filter, free education filter, pagination
- **Basic List** (`list`) — `StudentDirectoryTab` — paginated table with Excel export
- **Admission Letter** (`admission`) — `AdmissionLetterTab` — search student via `SearchPicker` → navigate to full-screen `@react-pdf/renderer` PDF viewer
- **Attachments** (`attachments`) — left panel student list, right panel attachment upload/download/delete
- **Family** (`family`) — `FamilyTab` — auto-groups students by `father_nic`, search, expandable family cards showing siblings
- **Promote** (`promote`) — `PromoteTab` — table with checkboxes, class filter, search, bulk promote to target class (only active students)
- **ID Cards** (`idcards`) — `StudentIdCardsTab` — All mode (class multi-select) / Select mode (server-side search by name & reg no), theme customization, iframe PDF preview, download

### Employee Tabs (sidebar sub-items, URL `?tab=`)
- **All Employees** (`all`) — card grid with search, role filter, active/inactive filter, pagination
- **Basic List** (`list`) — `EmployeeDirectoryTab` — paginated table
- **Manage Login** (`login`) — `ManageLoginTab` — manage employee login credentials (username, password reset, login active toggle)
- **Job Offer Letter** (`offer`) — `JobOfferTab` — search employee via `SearchPicker` → navigate to full-screen `@react-pdf/renderer` PDF viewer
- **Attachments** (`attachments`) — `AttachmentsTab` — left panel employee list, right panel attachment upload/download/delete
- **ID Cards** (`idcards`) — `IdCardsTab` → `IdCardsClient` — All/Select mode, server-side search, theme customization, iframe PDF preview, download

### API Routes (Students)
- `GET /api/students/[schoolId]` — list students (with search, classId, active, isFree, searchFields params)
- `POST /api/students/[schoolId]` — create new student
- `GET /api/students/[schoolId]/[studentId]` — get single student
- `PATCH /api/students/[schoolId]/[studentId]` — update student
- `DELETE /api/students/[schoolId]/[studentId]` — soft delete student
- `POST /api/students/[schoolId]/[studentId]/photo` — upload photo
- `GET /api/students/[schoolId]/[studentId]/attachments` — list attachments
- `POST /api/students/[schoolId]/[studentId]/attachments` — upload attachment
- `GET /api/students/[schoolId]/[studentId]/attachments/[attachmentId]` — download attachment
- `DELETE /api/students/[schoolId]/[studentId]/attachments/[attachmentId]` — delete attachment
- `POST /api/students/[schoolId]/import` — Excel bulk import (.xlsx parsed via xlsx library)
- `GET /api/students/[schoolId]/families` — family grouping by father_nic
- `POST /api/students/[schoolId]/promote` — bulk promote students to target class
- `GET /api/students/id-cards/pdf` — Puppeteer Student ID Card PDF (supports ids, classIds, theme params)

### API Routes (Employees — additional)
- `GET /api/employees/[schoolId]/job-offer/[employeeId]` — Job Offer Letter PDF (server-side)
- `GET /api/employees/id-cards/pdf` — Puppeteer Employee ID Card PDF (supports ids, theme params)

---

## 15. Shared UI Components (`components/ui/`)

| Component | Purpose |
| --- | --- |
| `directory-table.tsx` | Reusable paginated table — columns, search, filters, Excel export (styled with colors, borders, alternating rows), active/inactive tabs |
| `search-picker.tsx` | Reusable single-select search — debounced input, dropdown results, pick one |
| `letter-search-tab.tsx` | Wrapper combining SearchPicker + "Print" button for letter generation tabs |
| `pagination.tsx` | Page/pageSize controls for server-side paginated lists |
| `toast.tsx` | Toast notification system (ToastProvider + useToast hook) |
| `dialog.tsx` | Modal dialog (Radix-based) |
| `tabs.tsx` | Tab navigation component |
| `select.tsx` | Dropdown select (Radix-based) |

---

## 16. What to build next (Phase 2 priorities)

1. **Verify migrations applied**, then do a cleanup pass to clear the pre-existing `tsc` errors so `npm run build` passes.
2. **Sections** CRUD (assign section teachers), then **Teachers**, **Parents**.
3. **Attendance** (daily, per class/section), **Exams & Grades** (mark entry, report cards), **Fees** (structure, invoices, payments).
4. Then Phase 3: subscriptions/billing (Stripe), role portals, notifications, reports.

See `docs/roadmap.md` for the full plan.

---

## 17. Quick orientation for a fresh session

- To see the running app: `npm run dev`, open `http://localhost:3000` (lands on `/school-login`). Master dashboard is at `/master-login` → `/master`.
- To create a school to log in with: go to `/master-login` (env creds), create a school + first admin, then sign in at `/school-login` with that admin's email/password.
- The login mutation is `POST /api/auth/school-login` → sets `school_session` cookie → `/school` (guarded by `app/(admin)/layout.tsx`).
- Design system lives in `app/globals.css` (tokens) + `tailwind.config.ts` (brand color + keyframes). Brand purple `#6D4AFF` is `--primary` and `bg-brand`.
- All multi-tenant queries must read `schoolId` from the verified session — never trust client-supplied `schoolId` for writes.
- **Employee ID card PDFs** — `GET /api/employees/id-cards/pdf?ids=...&accentColor=...&goldColor=...`. Client uses `<iframe>` to preview and download button with `&download=1`.
- **Student ID card PDFs** — `GET /api/students/id-cards/pdf?ids=...&classIds=...&accentColor=...&goldColor=...`. Same iframe preview pattern.
- **Job offer letters** — server-side via `GET /api/employees/[schoolId]/job-offer/[employeeId]` (Puppeteer-based, returns PDF buffer).
- **Admission letters** — client-side via `@react-pdf/renderer` `PDFViewer` component at `/school/students/admission-letter/[studentId]`.
- **Color scheme** for ID cards and letters: Navy `#243c8b`, Gold `#c89a2b`, Dark Navy `#1d2f73`, Gold Light `#e8d39e`.
- **Sidebar** uses collapsible groups (Students, Employees, Settings) with tab-based sub-items navigating via `?tab=` URL params.
- **Server-side pagination** everywhere — `DirectoryTable` and `useServerPagination` hook handle page/pageSize/search state.
- **TanStack Query** for all data fetching with structured keys including `schoolId` and filter values.