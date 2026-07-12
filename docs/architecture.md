# Architecture

## High-Level

A single Next.js 15 (App Router) application that hosts:

- UI (React 19 + Tailwind + shadcn/ui)
- Server Components (default)
- Client Components (only where needed)
- API Route Handlers (`app/api/**/route.ts`)
- Service layer (`/services`) — pure business logic
- Supabase clients (`/lib/supabase`) — server-side, client-side, and service-role

```
┌──────────────────────────────────────────────────────────┐
│                       Browser                            │
│   React 19 (Server + Client components)                  │
│   - TanStack Query (data fetching cache)                 │
│   - React Hook Form + Zod (forms/validation)             │
│   - Framer Motion (animations)                           │
└───────────────┬──────────────────────────────────────────┘
                │  HTTPS / JSON
                ▼
┌──────────────────────────────────────────────────────────┐
│                  Next.js (App Router)                    │
│  ┌────────────────────────┐ ┌──────────────────────────┐ │
│  │ UI Pages (RSC)         │ │ API Route Handlers       │ │
│  │ app/(auth)             │ │ app/api/.../route.ts     │ │
│  │ app/(master)           │ │ - Validates Zod schemas  │ │
│  │ app/(admin)            │ │ - Extracts session/JWT   │ │
│  └────────────┬───────────┘ └─────────────┬────────────┘ │
│               │   thin wrappers           │              │
│               └──────────────┬────────────┘              │
│                              ▼                           │
│                ┌──────────────────────────────┐          │
│                │   services/  (business)      │          │
│                │   school.service.ts          │          │
│                │   settings.service.ts        │          │
│                │   auth.service.ts            │          │
│                └──────────────┬───────────────┘          │
└───────────────────────────────┼──────────────────────────┘
                                │  Supabase JS SDK
                                ▼
                  ┌────────────────────────────┐
                  │   Supabase (Postgres)      │
                  │   - schools                │
                  │   - school_admins          │
                  │   - RLS enabled            │
                  │   - Storage (logos)        │
                  └────────────────────────────┘
```

## Layers

### 1. Presentation

- React Server Components (RSC) by default.
- Client Components for: forms (RHF), sidebar toggle, toast, animations, logo preview.
- All client interactions go through TanStack Query → API route → service.

### 2. API Layer (`app/api`)

- Each route file is a thin wrapper:
  1. Validate request body/query with Zod.
  2. Extract user identity from JWT cookie (`lib/auth`).
  3. Call a service method.
  4. Return standardized `{ success, data, error }` JSON.
- No business logic in route handlers.

### 3. Service Layer (`services/`)

- Pure functions / classes that mutate or query DB.
- Examples:
  - `schoolService.create({ name, adminEmail, adminPassword })`
  - `settingsService.updateInstituteProfile(schoolId, payload)`
- Errors thrown as `AppError` subclasses; the API layer converts them to JSON responses.

### 4. Data Layer (`lib/supabase`)

- `supabaseServer()` — for use inside RSC and route handlers (cookie-based session).
- `supabaseBrowser()` — for client components (reads anon key).
- `supabaseService()` — service-role client, used only inside `services/` for trusted ops (e.g., creating schools + admins atomically).

### 5. Database (Supabase Postgres)

- All tables include `school_id` where tenant-scoped.
- Row Level Security (RLS) on every table.
- Service-role key bypasses RLS — used by migration runner and trusted service code only.

## Multi-Tenant Model

Single database, shared schema, **school_id** discriminator everywhere.

| Layer | Mechanism |
| --- | --- |
| DB | `school_id` FK + RLS policies reading JWT claim `school_id`. |
| API | `schoolId` always derived from verified session — never trusted from client. |
| Frontend | TanStack Query keys include `schoolId`. UI scoped to the active school. |

## Auth Flows

### Phase 1 — Master Login

1. POST `/api/auth/master-login` with `{ email, password }`.
2. Compare with `MASTER_EMAIL` and `MASTER_PASSWORD` from env.
3. On success, sign JWT with `{ role: "master" }`.
4. Set JWT in HTTP-only cookie `master_session`.

### Phase 2 — School Admin Login

1. POST `/api/auth/school-login` with `{ email, password }`.
2. `authService.verifyAdmin(email, password)` queries `school_admins`, bcrypt-compares.
3. Issue JWT `{ role: "admin", school_id, admin_id }`.
4. Set cookie `school_session`.

### Logout

- Clears the cookie (server action).

## File / Module Boundaries

- `/app` — pages + API only.
- `/components` — presentational, no data fetching.
- `/features` — feature-specific compositions (forms, dialogs) that may include client-side data hooks.
- `/services` — business logic; no JSX.
- `/lib` — utilities; no DB calls except in `lib/supabase`.
- `/hooks` — React hooks.
- `/types` — TypeScript types only.
