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
│                │   employee.service.ts        │          │
│                │   class.service.ts           │          │
│                │   student.service.ts         │          │
│                └──────────────┬───────────────┘          │
└───────────────────────────────┼──────────────────────────┘
                                │  Supabase JS SDK
                                ▼
                  ┌────────────────────────────┐
                  │   Supabase (Postgres)      │
                  │   - schools                │
                  │   - school_admins          │
                  │   - employees              │
                  │   - employee_attachments   │
                  │   - classes                │
                  │   - students               │
                  │   - student_attachments    │
                  │   - RLS enabled            │
                  │   - Storage (logos, photos) │
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
  - `employeeService.getEmployees(schoolId)` / `createEmployee` / `updateEmployee` / `deleteEmployee`
- Errors thrown as `AppError` subclasses; the API layer converts them to JSON responses.

### 4. Data Layer (`lib/supabase`)

- `supabaseServer()` — for use inside RSC and route handlers (cookie-based session).
- `supabaseBrowser()` — for client components (reads anon key).
- `supabaseService()` — service-role client, used only inside `services/` for trusted ops (e.g., creating schools + admins atomically, employee CRUD, file uploads).

### 5. PDF Generation Layer

Two distinct PDF generation approaches are used:

#### Puppeteer (ID Cards)
- **Route:** `app/api/employees/id-cards/pdf/route.ts` — server-side, launches headless Chrome
- **Template:** `features/employees/id-card-html.ts` — builds full HTML string with inline CSS
- **Flow:** API route fetches employees + school → builds HTML → `page.setContent()` → `page.pdf()` → returns PDF buffer
- **Why Puppeteer:** Supports complex CSS (gradients, box-shadows, web fonts, z-index layering) needed for the premium ID card design
- **Card size:** CR80 portrait (53.98mm × 85.6mm), 6 cards per A4 page

#### `@react-pdf/renderer` (Job Offer Letters)
- **Template:** `features/employees/job-offer-letter-pdf.tsx` — React component tree → PDF
- **Viewer:** `features/employees/job-offer-pdf-viewer.tsx` — client-side `PDFViewer` wrapper
- **Why react-pdf:** Better for multi-page, text-heavy documents with automatic pagination
- `next.config.js` has `transpilePackages: ["@react-pdf/renderer"]`

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
- `/features` — feature-specific compositions (forms, dialogs, PDF templates) that may include client-side data hooks.
- `/services` — business logic; no JSX.
- `/lib` — utilities; no DB calls except in `lib/supabase`.
- `/hooks` — React hooks.
- `/types` — TypeScript types only.

### Key feature directories (`features/employees/`)

| File | Purpose |
| --- | --- |
| `employee-form.tsx` | Add/edit employee form (RHF + Zod) |
| `employee-list.tsx` | Table with search, filter, pagination |
| `employee-detail.tsx` | Detail page with tabs (profile, attachments) |
| `employee-attachments.tsx` | Attachment upload/download/delete |
| `id-cards-client.tsx` | ID card UI — employee selection, theme picker, iframe preview, download |
| `id-card-types.ts` | `IdCardTheme` interface + `DEFAULT_ID_CARD_THEME` |
| `id-card-html.ts` | HTML template for Puppeteer PDF (CR80 portrait, premium design) |
| `job-offer-letter-pdf.tsx` | `@react-pdf/renderer` Job Offer Letter document |
| `job-offer-pdf-viewer.tsx` | Client-side `PDFViewer` wrapper for offer letter |
| `job-offer-tab.tsx` | Tab component to launch offer letter viewer |
