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
- **ID Card generation** — Puppeteer-based, CR80 portrait (53.98mm × 85.6mm), premium design with navy/gold theme, logo watermark, gold-ring photo, STAFF ID badge in header, 6 cards per A4 page, theme customization (accent/gold/text/bg colors), iframe preview + download
- **Job Offer Letter** — `@react-pdf/renderer` based, premium template with navy/gold color scheme matching ID cards, school logo watermark (centered, fixed overlay), 2-page letter (particulars + terms), signature blocks, bottom accent strip

Not yet built (Phase 2/3):
- Teacher / Parent / Student portals (role cards exist in the login UI but show a "coming soon" toast)
- Attendance, Exams, Fees, Students/Teachers/Parents CRUD
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
| `/school/employees` | Employee list with search, filter, pagination |
| `/school/employees/[employeeId]` | Employee detail page (profile, attachments, actions) |
| `/school/employees/id-cards` | ID card generation — select employees, customize theme, preview PDF in iframe, download |
| `/school/employees/offer-letter/[employeeId]` | Job offer letter PDF viewer (full-screen) |
| `/master-login` | **Hidden** — type URL directly. Master super-admin login (creates/manages schools). Not linked anywhere in the UI. |
| `/master` | Master dashboard |
| `/master/create-school` | Create school + first admin |

---

## 5. Architecture (layers, top to bottom)

```
Browser (RSC + client components, TanStack Query, RHF+Zod, Framer Motion)
        │  HTTPS/JSON
Next.js App Router
  ├── app/**/page.tsx        (Server Components by default)
  ├── app/api/**/route.ts    (thin handlers: validate → auth → call service → respond)
  └── features/**            (client feature compositions: forms, login UI)
        │
services/*.service.ts        (all business logic; throws AppError subclasses)
        │  Supabase JS SDK
lib/supabase/*               (server / browser / service clients)
        │
Supabase Postgres            (schools, school_admins, RLS, Storage)
```

### Multi-tenancy enforced in 3 layers
1. **DB** — every tenant table has `school_id` FK + RLS policy.
2. **API** — route handlers derive `schoolId` from the verified JWT session, never from client input.
3. **Frontend** — TanStack Query keys are namespaced with `schoolId` (e.g. `["school", schoolId]`, `["institute-profile", schoolId]`).

### Auth (custom JWT, HTTP-only cookies — `lib/auth/jwt.ts`)
- **Master:** compare creds against env, sign HS256 JWT `{ role: "master" }`, 7d expiry, cookie `master_session`.
- **School admin:** `verifyAdminPassword` bcrypt-compares against `school_admins.password_hash`, sign JWT `{ role: "admin", schoolId, adminId, email }`, cookie `school_session`.
- **Logout:** `POST /api/auth/logout` clears both cookies.
- Cookies are `httpOnly`, `secure` in prod, `sameSite: lax`.

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
│           └── account-settings/page.tsx
│
└── api/
    ├── auth/{master-login,school-login,logout}/route.ts
    ├── schools/route.ts                      GET list, POST create (master only)
    ├── schools/[schoolId]/route.ts          GET/PATCH/DELETE (master only)
    ├── settings/
    │   ├── institute-profile/[schoolId]/route.ts       GET/PATCH (admin of that school)
    │   ├── institute-profile/[schoolId]/logo/route.ts  POST FormData → Supabase Storage
    │   └── account-settings/[schoolId]/route.ts         GET/PATCH currency/timezone
    ├── employees/
    │   ├── [schoolId]/route.ts                          GET list, POST create
    │   ├── [schoolId]/[employeeId]/route.ts             GET, PATCH, DELETE
    │   ├── [schoolId]/[employeeId]/photo/route.ts       POST FormData → Supabase Storage
    │   ├── [schoolId]/[employeeId]/attachments/route.ts GET, POST attachments
    │   ├── [schoolId]/[employeeId]/attachments/[attachmentId]/download/route.ts
    │   └── id-cards/pdf/route.ts                        GET — Puppeteer PDF generation

components/
├── providers.tsx            QueryClientProvider + ToastProvider (root)
├── layout/
│   ├── admin-shell.tsx       Client context provider (school, sidebar state, logout) + layout
│   ├── admin-sidebar.tsx     ★ Collapsible "General Settings" accordion; active-link highlight; mobile overlay
│   └── admin-topbar.tsx      Breadcrumb + school badge + admin avatar + mobile menu button
├── layout/master-navbar.tsx
└── ui/                       button, input, label, select, card, avatar, dropdown-menu, textarea, separator, toast

features/
├── auth/
│   ├── login/                ★ Premium login UI (see §7)
│   └── school-login-form.tsx (OLD — superseded by login/, kept but unused)
├── admin/dashboard.tsx
├── master/{master-login-form,create-school-form,schools-list}.tsx
├── settings/{institute-profile-form,account-settings-form}.tsx
├── employees/
│   ├── employee-form.tsx          Add/edit employee form (RHF + Zod)
│   ├── employee-list.tsx          Table with search, filter, pagination
│   ├── employee-detail.tsx        Detail page with tabs (profile, attachments)
│   ├── employee-attachments.tsx   Attachment upload/download/delete
│   ├── id-cards-client.tsx        ID card UI — employee selection, theme picker, iframe preview, download
│   ├── id-card-types.ts           IdCardTheme interface + DEFAULT_ID_CARD_THEME
│   ├── id-card-html.ts            HTML template for Puppeteer PDF (CR80 portrait, premium design)
│   ├── job-offer-letter-pdf.tsx   @react-pdf/renderer Job Offer Letter document
│   ├── job-offer-pdf-viewer.tsx   Client-side PDFViewer wrapper for offer letter
│   └── job-offer-tab.tsx          Tab component to launch offer letter viewer

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
└── employee.service.ts       getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee

types/
├── school.types.ts           School, SchoolAdmin, Employee, NewEmployee, UpdateEmployee, NewSchool, UpdateSchool
└── api.types.ts

supabase/
├── migrate.ts                Migration runner (reads .env, reads migrations/, tries exec_sql RPC)
└── migrations/
    ├── 0001_initial_schema.sql   schools + school_admins + updated_at trigger
    └── 0002_rls_and_storage.sql   enable RLS, public-read policies, create school-logos bucket
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
- **Sidebar** (`admin-sidebar.tsx`): dark theme, mobile overlay (AnimatePresence), active-link highlight, and a **collapsible "General Settings" accordion** (ChevronDown rotates, sub-items slide in with height animation, defaults open when on a settings route).
- **Topbar** (`admin-topbar.tsx`): breadcrumb + school badge (logo) + admin avatar + mobile menu button.

---

## 9. Database schema (current)

### `schools` (root tenant entity, one row per school)
`id` (uuid pk, gen_random_uuid), `name`, `tagline`, `phone`, `email`, `website`, `address`, `country`, `logo_url`, `currency_symbol` (default `$`), `currency_name` (default `USD`), `timezone` (default `UTC`), `created_at`, `updated_at` (trigger-updated).

### `school_admins`
`id` (uuid pk), `school_id` (fk → schools, ON DELETE CASCADE), `name`, `email`, `password_hash` (bcrypt), `is_active` (bool), `created_at`, `updated_at`; unique `(school_id, email)`.

### `employees`
`id` (uuid pk), `school_id` (fk → schools, ON DELETE CASCADE), `employee_code` (auto-generated, unique per school), `name`, `role` (designation), `father_husband_name`, `gender` (male/female/other), `religion`, `cnic`, `date_of_birth`, `date_of_joining`, `salary` (numeric), `experience`, `phone`, `email`, `address`, `education`, `photo_url`, `login_username` (auto-generated), `password_hash` (bcrypt), `is_login_active` (bool), `is_active` (bool), `created_at`, `updated_at`.

### `employee_attachments`
Attachments uploaded for employees (documents, certificates, etc.). Stored in Supabase Storage.

### RLS
Enabled on both tables. Public-read policies + service-role bypass for trusted writes. Policies will tighten once school-admin login RBAC lands.

### Storage
Bucket `school-logos` — public read, authenticated write. Logo upload goes through the service-role API route (`/api/settings/institute-profile/[schoolId]/logo`): validates 500KB / JPG/PNG, uploads, updates `schools.logo_url`.
Bucket `employee-photos` — for employee profile photos.
Bucket `employee-attachments` — for employee documents/certificates.

### Reserved (schema-ready, not built)
students, teachers, parents, classes, sections, subjects, attendance, exams, grades, fee_structure, invoices, payments, subscriptions, plans — all FK-linked to `school_id`.

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
- List page with search, role filter, pagination
- Detail page with tabs: profile info, attachments
- Photo upload via Supabase Storage
- Attachment upload/download/delete
- Active/inactive toggle
- Auto-generated `employee_code` and `login_username`

### ID Card Generation (Puppeteer-based)
- **Route:** `app/api/employees/id-cards/pdf/route.ts` — GET request, returns PDF buffer
- **Template:** `features/employees/id-card-html.ts` — builds HTML string with CSS
- **Client:** `features/employees/id-cards-client.tsx` — employee selection, theme customization, iframe preview, download button
- **Types:** `features/employees/id-card-types.ts` — `IdCardTheme` interface + `DEFAULT_ID_CARD_THEME`
- **Card size:** CR80 portrait (53.98mm × 85.6mm), 6 cards per A4 page (2 cols × 3 rows)
- **Design:** Navy gradient header with gold underline, circular logo overlapping header, STAFF ID badge (gold pill, header right), school name + tagline, gold-ring circular photo, name, info rows (Employee ID, Designation, Phone, Joining Date), navy footer with school phone + address, logo watermark
- **Theme:** Customizable accent color, gold color, text color, bg color. Default: `#243c8b` accent, `#c89a2b` gold, `#1f2937` text, `#ffffff` bg
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

## 13. What to build next (Phase 2 priorities)

1. **Verify migrations applied**, then do a cleanup pass to clear the pre-existing `tsc` errors so `npm run build` passes.
2. **Classes & Sections** CRUD, then **Students** (with photo upload reusing the Storage pattern), **Teachers**, **Parents**.
3. **Attendance** (daily, per class/section), **Exams & Grades** (mark entry, report cards), **Fees** (structure, invoices, payments).
4. Then Phase 3: subscriptions/billing (Stripe), role portals, notifications, reports.

See `docs/roadmap.md` for the full plan.

---

## 14. Quick orientation for a fresh session

- To see the running app: `npm run dev`, open `http://localhost:3000` (lands on `/school-login`). Master dashboard is at `/master-login` → `/master`.
- To create a school to log in with: go to `/master-login` (env creds), create a school + first admin, then sign in at `/school-login` with that admin's email/password.
- The login mutation is `POST /api/auth/school-login` → sets `school_session` cookie → `/school` (guarded by `app/(admin)/layout.tsx`).
- Design system lives in `app/globals.css` (tokens) + `tailwind.config.ts` (brand color + keyframes). Brand purple `#6D4AFF` is `--primary` and `bg-brand`.
- All multi-tenant queries must read `schoolId` from the verified session — never trust client-supplied `schoolId` for writes.
- **ID card PDFs** are generated via Puppeteer at `GET /api/employees/id-cards/pdf?ids=...&accentColor=...&goldColor=...`. The client uses an `<iframe>` to preview and a download button with `&download=1`.
- **Job offer letters** are generated client-side via `@react-pdf/renderer` `PDFViewer` component (no server route needed).
- **Color scheme** for both ID cards and offer letters: Navy `#243c8b`, Gold `#c89a2b`, Dark Navy `#1d2f73`, Gold Light `#e8d39e`.