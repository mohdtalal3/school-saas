# Project Memory — School ERP SaaS

This document is the **single source of truth** for the entire project.
If a new Claude chat needs to be onboarded, simply say: **"Read MEMORY.md"**.

---

## 1. Project Overview

A modern, multi-tenant **School ERP SaaS** platform inspired by the workflow and UX of eSkooly (no code or asset copying — visual/UX inspiration only).

The product is being built for production use, with the goal of supporting thousands of schools with clean architecture, scalability, and easy maintainability.

### Current Scope (Phase 1)

- Master Login (env-driven, used only to create schools) — **hidden endpoint**, not linked from the app
- Master Dashboard with School Creation form
- School Admin Login page (premium two-panel UI, `/school-login`)
- Admin Portal for schools (Dashboard + General Settings)
- Multi-tenant architecture with full data isolation
- Subscriptions/billing: **not yet implemented**

### Out of Scope (Phase 1)

- Teacher, Parent, Student portals (role cards exist in login UI but show a "coming soon" toast)
- Attendance, Exams, Fees modules (DB-ready, not built)
- Subscription billing
- Public marketing site

---

## 2. Folder Structure

```
school/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # Auth route group (Master Login)
│   │   └── master-login/
│   │       └── page.tsx
│   ├── (master)/                 # Master dashboard route group
│   │   ├── layout.tsx
│   │   └── master/
│   │       ├── page.tsx          # Master dashboard
│   │       └── create-school/
│   │           └── page.tsx
│   ├── (admin)/                  # Admin portal route group
│   │   ├── layout.tsx
│   │   └── school/
│   │       ├── page.tsx          # Admin dashboard
│   │       └── settings/
│   │           ├── layout.tsx
│   │           ├── page.tsx      # redirects to institute-profile
│   │           ├── institute-profile/page.tsx
│   │           └── account-settings/page.tsx
│   ├── api/                      # Backend Route Handlers
│   │   ├── auth/
│   │   │   ├── master-login/route.ts
│   │   │   ├── school-login/route.ts
│   │   │   └── logout/route.ts
│   │   ├── schools/
│   │   │   ├── route.ts          # POST: create school
│   │   │   └── [schoolId]/
│   │   │       └── route.ts      # GET, PATCH, DELETE
│   │   └── settings/
│   │       ├── institute-profile/[schoolId]/route.ts
│   │       └── account-settings/[schoolId]/route.ts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Root redirect
│   └── globals.css
│
├── components/                   # Reusable UI components (shadcn-style)
│   ├── ui/                       # Primitive components
│   ├── layout/                   # Sidebar, Navbar, etc.
│   └── shared/                   # Shared composites
│
├── features/                     # Feature-based business logic
│   ├── master/                   # Master login + dashboard
│   ├── schools/                  # School CRUD
│   ├── settings/                 # Settings features
│   └── auth/                     # Auth helpers
│
├── lib/                          # Generic utilities
│   ├── supabase/                 # Supabase clients (server, client, service)
│   ├── auth/                     # JWT/session utilities
│   ├── utils.ts                  # cn(), formatters
│   └── env.ts                    # Validated env vars
│
├── services/                     # Reusable business logic services
│   ├── school.service.ts
│   ├── settings.service.ts
│   └── auth.service.ts
│
├── hooks/                        # Custom React hooks
│   ├── use-session.ts
│   ├── use-school.ts
│   └── use-toast.ts
│
├── types/                        # Shared TypeScript types
│   ├── database.types.ts
│   ├── school.types.ts
│   └── api.types.ts
│
├── supabase/
│   ├── migrations/               # SQL migration files
│   ├── seed.sql
│   └── migrate.ts                # Migration runner script
│
├── docs/
│   ├── architecture.md
│   ├── database.md
│   └── roadmap.md
│
├── public/
├── .env / .env.example
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── postcss.config.js
├── package.json
└── MEMORY.md
```

---

## 3. Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (Strict Mode) |
| UI | React 19, Tailwind CSS |
| Components | shadcn/ui (Radix primitives) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| ORM | **None** (raw SQL migrations only, no Prisma) |
| Auth | JWT in HTTP-only cookies (custom) |

### Why these choices?

- **Next.js 15 App Router** — single codebase for UI + API, server components reduce JS shipped to client.
- **No Prisma** — explicit requirement. We use the Supabase JS SDK + SQL migrations for clarity and DB control.
- **JWT in HTTP-only cookies** — no Supabase Auth (yet). Master login is env-based; school admins use a custom hashed-password flow. Simpler for Phase 1.

---

## 4. Database Schema (current)

### Core multi-tenant tables

- `schools` — root entity. One row per tenant.
  - `id` (uuid, pk)
  - `name`, `tagline`, `phone`, `email`, `website`, `address`, `country`
  - `logo_url`
  - `currency_symbol`, `currency_name`, `timezone`
  - `created_at`, `updated_at`
- `school_admins` — admins belonging to a school.
  - `id`, `school_id` (fk), `email`, `password_hash`, `name`, `is_active`, timestamps.

### Future-ready (schema reserved)

Even though we won't build these modules in Phase 1, the schema is ready for:

- `students`, `teachers`, `parents`
- `classes`, `sections`, `subjects`
- `attendance`, `exams`, `grades`
- `fee_structure`, `invoices`, `payments`
- `subscriptions`, `plans`, `billing`

All will be FK-linked to `school_id`.

RLS policies are enabled on every table — `school_id` is enforced via session claims (current_school_id) so cross-tenant reads/writes are blocked at the DB level.

Full schema docs: `docs/database.md`.

---

## 5. Completed Features (Phase 1)

| # | Feature | Status |
| --- | --- | --- |
| 1 | Project scaffolding (Next.js 15 + Tailwind + shadcn-style UI) | ✅ |
| 2 | Premium School Admin Login UI (`/school-login`, two-panel, Framer Motion) | ✅ |
| 3 | Master Login (env credentials, hidden endpoint) | ✅ |
| 4 | Master Dashboard | ✅ |
| 5 | Create School (with first admin) | ✅ |
| 6 | Admin Portal layout (Sidebar + Top Navbar, responsive) | ✅ |
| 7 | Admin Dashboard page | ✅ |
| 8 | Institute Profile (logo upload, fields, update button) | ✅ |
| 9 | Account Settings (currency, timezone) | ✅ |
| 10 | Logout | ✅ |
| 11 | School-scoped session with HTTP-only JWT cookie | ✅ |
| 12 | Multi-tenant DB schema with RLS | ✅ |

---

## 6. Pending / Future Features

| Phase | Module | Status |
| --- | --- | --- |
| 2 | School Admin login (email + password) | ⏳ |
| 2 | Attendance module | ⏳ |
| 2 | Exams & grading | ⏳ |
| 2 | Fee management | ⏳ |
| 2 | Students / Teachers / Parents CRUD | ⏳ |
| 3 | Subscription plans & billing | ⏳ |
| 3 | Teacher / Parent / Student portals | ⏳ |
| 3 | Reports & analytics | ⏳ |
| 3 | Notifications (email/in-app) | ⏳ |

See `docs/roadmap.md` for details.

---

## 7. Architecture Decisions

- **Single Next.js app** hosts UI and API Route Handlers.
- **Service layer** (`/services`) holds ALL business logic. Route handlers are thin wrappers that validate input → call service → return response.
- **Multi-tenancy** is enforced in three layers:
  1. SQL: every table that contains tenant data has `school_id` FK + RLS policy.
  2. Backend: route handlers extract `school_id` from the verified JWT session, never trust the client.
  3. Frontend: TanStack Query keys are namespaced with `schoolId`.
- **Auth** — Two flows:
  - **Master**: credentials in `.env`, validated server-side, JWT issued with `role=master`.
  - **School Admin**: email + password stored in `school_admins.password_hash` (bcrypt). JWT issued with `role=admin`, `school_id`.
- **No Prisma** — using Supabase JS SDK + raw SQL migrations only.
- **Animations** — Framer Motion for page transitions and micro-interactions; Tailwind for utilities.
- **Server Components first** — Client Components only when interactivity is required (forms, animations).

---

## 8. Coding Conventions

- TypeScript **strict mode** — no `any`, no implicit `any`.
- Components: PascalCase. Utilities: camelCase. Files: kebab-case for non-component files.
- Naming:
  - Server actions / route handlers under `app/api/.../route.ts`.
  - Services under `services/*.service.ts`.
  - Validation schemas co-located with features.
- Errors: Throw typed `AppError`. Route handlers convert to API responses with consistent shape `{ success, data, error }`.
- Forms: React Hook Form + Zod resolver.
- Tailwind classes via `cn()` helper. No inline styles for theming.
- All env access through `lib/env.ts` (typed and validated).
- All API responses standardized: `lib/api-response.ts`.

---

## 9. Important Notes

- `.env` is committed **only for Phase 1 development** with the secret keys supplied by the user. Before deploying to production, `.env` must be moved to a secret manager.
- Supabase Storage bucket `school-logos` must exist and be **public** (read-only).
- RLS is enabled on all tables; the service role key bypasses RLS and is used only by migration scripts and admin-side service functions.
- Master login is intentionally simple (env creds) — this is documented as Phase 1 only.
- All migrations live in `supabase/migrations/` and are executed via `npm run db:migrate` using the service role key.

---

## 10. How to Run

```bash
# 1. Install deps
npm install

# 2. Run migrations
npm run db:migrate

# 3. Start dev server
npm run dev
```

App: <http://localhost:3000>

- `/` → redirects to `/school-login` (public entry)
- `/school-login` → premium school admin login (Admin role functional; Employee/Student show "coming soon")
- `/school` → Admin portal (guarded by `school_session` cookie)
- `/master-login` → **hidden** master login (type URL directly; only used to create schools)
- `/master` → Master dashboard (create / manage schools)
