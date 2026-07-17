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
                  │   - fee_particulars        │
                  │   - fee_invoices           │
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
  - `employeeService.getEmployees(schoolId)` / `createEmployee` (auto-generates EMP-YYYY-NNNN from date_of_joining) / `updateEmployee` / `deleteEmployee`
  - `feeService.getFeeParticulars(schoolId)` / `createFeeParticular` / `updateFeeParticular` / `deleteFeeParticular`
  - `feeInvoiceService.generateInvoices(schoolId, payload)` (auto-generates INV-MM_YYYY_NNNN, filters FINE, bakes discounts directly into charge amounts — no separate discount line items, reads annual due from student.previous_annual_due running balance; supports `custom_particulars` for student-wise Edit & Generate mode — uses edited amounts directly, separates FINE into `fine_after_due`, applies discounts to charge amounts, adds `add_to_balance` items to `student.previous_balance` after generation) / `getInvoices` / `getInvoicesByIds` / `getInvoicesByClassAndMonth` / `getInvoicesByMonth` / `deleteInvoice` / `collectFee(schoolId, payload)` (records payment, updates invoice status/paid_amount, reduces student.previous_balance by amount paid toward PREVIOUS BALANCE particular + adds unpaid non-carried charges, adjusts previous_annual_due for partial annual due payments) / `deletePayment(schoolId, paymentId)` (reverses payment: restores invoice particulars, reverses previous_balance and previous_annual_due changes) / `getPaymentHistory(schoolId, invoiceId)` / `payAnnualDue(schoolId, studentId, amount)`
- Errors thrown as `AppError` subclasses; the API layer converts them to JSON responses.

### 4. Data Layer (`lib/supabase`)

- `supabaseServer()` — for use inside RSC and route handlers (cookie-based session).
- `supabaseBrowser()` — for client components (reads anon key).
- `supabaseService()` — service-role client, used only inside `services/` for trusted ops (e.g., creating schools + admins atomically, employee CRUD, file uploads).

### 5. PDF Generation Layer

Two distinct PDF generation approaches are used:

#### Puppeteer (ID Cards)
- **Routes:**
  - `app/api/employees/id-cards/pdf/route.ts` — employee ID cards (server-side, launches headless Chrome)
  - `app/api/students/id-cards/pdf/route.ts` — student ID cards (same Puppeteer flow)
- **Templates:**
  - `features/employees/id-card-html.ts` — employee card HTML template (CR80 portrait, premium design)
  - `features/students/student-id-card-html.ts` — student card HTML template (same CSS/layout, student-specific fields)
- **Shared types:** `features/employees/id-card-types.ts` — `IdCardTheme` interface + `DEFAULT_ID_CARD_THEME` (imported by both employee and student features)
- **Flow:** API route fetches data + school → builds HTML → `page.setContent()` → `page.pdf()` → returns PDF buffer
- **Selection modes:** Both support "all" (optionally filtered by class for students) and "select" (individual pick via server-side search). PDF endpoint receives `ids` or `classIds` as query params and fetches only what's needed.
- **Why Puppeteer:** Supports complex CSS (gradients, box-shadows, web fonts, z-index layering) needed for the premium ID card design
- **Card size:** CR80 portrait (53.98mm × 85.6mm), 6 cards per A4 page

#### `@react-pdf/renderer` (Fee Invoices)
- **Template:** `features/fees/fee-invoice-pdf.tsx` — 3 invoices per A4 page (stacked vertically), black & white palette
- **Viewer:** `features/fees/fee-invoice-pdf-viewer.tsx` — client-side `PDFViewer` wrapper
- **Page:** `app/(admin)/school/fees/invoices/page.tsx` — server-side page that fetches invoices by IDs, class+month, all-classes+month, or search+month filters
- **Features:** School header with logo, student info (name, reg, father, mobile), particulars table (Particular, Charged, Paid, Remaining columns), Total Payable row, payment summary (Paid in this receipt, Remaining Balance), status badge, footer with month/due date/late fine info. Discounts are baked into charge amounts — no separate discount line items shown.
- **Bulk download:** Uses filter params (search, feeMonth, allClasses) instead of passing all invoice IDs in URL — scalable for 1500+ students

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

## Layout & Navigation Conventions

### Sidebar Dropdown Groups

The admin sidebar uses collapsible groups for modules with multiple sub-views (Students, Employees, Settings). Each group:

- Has a parent button that toggles open/close (Framer Motion animated).
- Contains sub-items that navigate via URL query params (e.g., `/school/students?tab=family`).
- Auto-expands when the user is on the parent page.
- Highlights the active sub-item based on `useSearchParams` tab value.

### Tab State via URL

Tabs are no longer managed by local React state. Instead:

- The active tab is read from `useSearchParams().get("tab")`.
- Sidebar sub-items link to `?tab=<value>`.
- Content is conditionally rendered based on the tab value.
- This enables deep-linking, browser back/forward, and bookmarkable views.

### Suspense Boundaries

Components using `useSearchParams` must be wrapped in `<Suspense>`:

- `AdminSidebar` is wrapped in `AdminShell`.
- Page-level components (e.g., `StudentManagement`, `EmployeeManagement`) are wrapped in their respective `page.tsx` files.

### Page Container & Layout Conventions

All admin portal pages follow a consistent container pattern:

- **Page root:** `<div className="space-y-6">` — vertical rhythm between major sections.
- **Page header:** `<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">` — title + description on left, action button on right. Stacks on mobile.
- **Card grids:** `grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — responsive card layouts for employee/student class cards.
- **Tab content:** Each tab renders inside the same `space-y-6` container. No extra wrapper needed.
- **Forms:** `<form className="space-y-5">` — fields grouped with `grid gap-4 sm:grid-cols-2` (or `sm:grid-cols-3`) for side-by-side inputs. Single-column on mobile.
- **Field groups:** Bordered sections use `rounded-lg border p-3 space-y-3` with a `text-xs font-semibold uppercase tracking-wider text-muted-foreground` label.
- **Dialogs:** `DialogContent` with `sm:max-w-md` (confirm), `sm:max-w-2xl` (view/edit), `max-h-[90vh] overflow-y-auto` for long content.
- **ID card / theme pages:** `space-y-6 p-4 sm:p-6` root, with `grid gap-6 lg:grid-cols-[1fr_320px]` for main content + sidebar.
- **Search-centric tabs** (Family, Admission Letter): Centered `max-w-2xl mx-auto` card container.
- **Scrollable lists:** `max-h-[300px] overflow-y-auto rounded-md border bg-muted/20 p-2` for selected items, search results dropdowns.

## Data Loading Architecture

### Server-Side Pagination

All list views use server-side pagination:

- **Client** sends `page` and `limit` (or `pageSize`) as query params.
- **API route** passes them to the service layer.
- **Service layer** uses Supabase `.range(offset, offset + limit - 1)` with `{ count: "exact" }`.
- **Response** includes `{ data: [...], total: number, counts?: {...} }`.
- **Client** renders a `<Pagination>` component with page/pageSize controls.

### Search & Filtering

- Search is debounced on the client (300ms) before triggering a refetch.
- Filters (active/inactive, class, free education) are sent as query params.
- TanStack Query keys include all filter values for proper cache invalidation.

### Search Pattern Consistency

All list views and search-driven features follow the same pattern:

1. **`useServerPagination` hook** (`lib/use-server-pagination.ts`) — manages `page`, `pageSize`, and `search` state. On search change, resets to page 1. Default pageSize: 25.
2. **Debounced search** — every component creates a `debouncedSearch` state with a 300ms `setTimeout` effect. The `useQuery` call uses `debouncedSearch` (not raw `search`) as both the query key and the API param.
3. **Server-side execution** — search is never done client-side. The API route passes `search` to the service layer, which builds a Supabase `.or()` / `.ilike()` query.
4. **`searchFields` parameter** (students only) — `getStudents` accepts an optional `searchFields` param to restrict which columns are searched. Default: `name, registration_no, father_name, mobile`. Student ID cards tab restricts to `name, registration_no` to avoid ambiguous father name matches.
5. **Minimum query length** — ID card "Select" mode requires ≥2 characters before triggering search.
6. **Two search UI patterns:**
   - **DirectoryTable** — search bar integrated into the table header, debounced, triggers server refetch with pagination.
   - **SearchPicker** — standalone debounced search with dropdown results, used for single-select flows (Admission Letter, Job Offer Letter).
7. **Query key structure** — `["entity", schoolId, page, pageSize, debouncedSearch, ...filters]`. Consistent across all components sharing the same data type.

### TanStack Query Usage

- All data fetching uses `useQuery` with structured keys (e.g., `["students", schoolId, page, pageSize, search, classFilter, activeFilter, isFreeOnly]`).
- Mutations use `useMutation` and invalidate relevant query keys on success.
- Query keys must be consistent across components sharing the same data (e.g., `["classes", schoolId]` must return the same shape everywhere).

### Key feature directories (`features/employees/`)

| File | Purpose |
| --- | --- |
| `employee-form.tsx` | Add/edit employee form (RHF + Zod) |
| `employee-management.tsx` | Main page — tabs: All, Basic List, Manage Login, Job Offer, Attachments, ID Cards |
| `employee-directory-tab.tsx` | Basic List tab — paginated table |
| `employee-view-dialog.tsx` | View employee details dialog |
| `attachments-tab.tsx` | Attachments tab — left panel list, right panel upload/download/delete |
| `employee-attachments-form.tsx` | Attachment form |
| `manage-login-tab.tsx` | Manage employee login credentials (username, password reset, login active toggle) |
| `id-cards-tab.tsx` | Thin wrapper — passes `schoolId` to `IdCardsClient` |
| `id-cards-client.tsx` | ID card UI — employee selection (All/Select mode), server-side search, theme picker, iframe preview, download |
| `id-card-types.ts` | `IdCardTheme` interface + `DEFAULT_ID_CARD_THEME` (shared with student ID cards) |
| `id-card-html.ts` | HTML template for Puppeteer PDF (CR80 portrait, premium design) |
| `job-offer-letter-pdf.tsx` | `@react-pdf/renderer` Job Offer Letter document |
| `job-offer-pdf-viewer.tsx` | Client-side `PDFViewer` wrapper for offer letter |
| `job-offer-tab.tsx` | Tab component to launch offer letter viewer |

### Key feature directories (`features/students/`)

| File | Purpose |
| --- | --- |
| `student-form.tsx` | Add/edit student form (RHF + Zod) |
| `student-management.tsx` | Main student page — card grid, filters, dialogs |
| `student-directory-tab.tsx` | Basic List tab — paginated table with Excel export (styled) |
| `import-students-dialog.tsx` | Excel bulk import dialog — class select, .xlsx file upload, styled sample Excel template (2 sheets: Students + Instructions) |
| `admission-letter-tab.tsx` | Admission letter generation tab (SearchPicker → PDF viewer) |
| `admission-letter-pdf.tsx` | `@react-pdf/renderer` Admission Letter document |
| `admission-letter-pdf-viewer.tsx` | Client-side `PDFViewer` wrapper |
| `family-tab.tsx` | Family grouping tab — auto-groups students by father CNIC, search, expandable cards |
| `promote-tab.tsx` | Promote students tab — table with checkboxes, class filter, search, bulk promote to target class |
| `student-id-cards-tab.tsx` | Student ID card UI — All mode (class multi-select) / Select mode (server-side search), theme picker, iframe preview, download |
| `student-id-card-html.ts` | HTML template for student ID cards (same CR80 layout, student-specific fields: Reg No, Class, Father, DOB, Blood) |

### Key feature directories (`features/fees/`)

| File | Purpose |
| --- | --- |
| `fee-management.tsx` | Main fee page — tab routing via `?tab=` URL param |
| `fee-particulars-tab.tsx` | Fee particulars config — list, add, edit, delete; fixed vs custom line items; auto-seeded defaults |
| `fee-invoice-generator-tab.tsx` | Invoice generator — class/student/all-classes mode, form, generate, PDF preview/download; server-side search with debounce (name, reg no, father CNIC, mobile), month filter defaults to current month, Download All by month filter (no IDs in URL), duplicate prevention per month |
| `fee-invoice-pdf.tsx` | `@react-pdf/renderer` fee invoice PDF — 3 invoices per A4 page (stacked vertically), black & white, school header, student info, particulars table (Charged/Paid/Remaining), Total Payable, payment summary, footer with due date + late fine info. Discounts baked into charge amounts |
| `fee-invoice-pdf-viewer.tsx` | Client-side `PDFViewer` wrapper for fee invoices |
| `collect-fees-tab.tsx` | Collect fees — search invoices by name/reg no/father CNIC/mobile/invoice no + month filter (defaults to current month), per-particular payment breakdown with allocation inputs, Allocate Full / Clear buttons, payment note, print invoice prompt after successful payment |
| `invoice-search-tab.tsx` | Search invoices — debounced search by name/reg no/father CNIC/mobile, month filter, preview/download PDF per invoice or bulk, delete invoice |
| `fee-defaulters-tab.tsx` | Fee defaulters — summary cards (total defaulters, outstanding amount), month filter (defaults to current month), class filter, debounced search, paginated table with invoice/student/remaining details, print list button (opens print-optimized HTML) |
| `fee-report-tab.tsx` | Fee report — 4 summary cards (estimated, collected, remaining, collection rate), month filter (defaults to current month), CSS bar chart showing collection by class (estimated vs collected), class breakdown table with search + totals row, print report (print-optimized HTML), Excel export (xlsx-js-style) |
