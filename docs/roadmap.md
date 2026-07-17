# Roadmap

## Phase 1 — Foundation & Core Portal (COMPLETE)

**Goal:** Get the multi-tenant foundation, master login, and admin portal skeleton in place.

| # | Feature | Status |
| --- | --- | --- |
| 1 | Project scaffolding (Next.js 15 + Tailwind + shadcn) | ✅ |
| 2 | Supabase clients (server/browser/service) | ✅ |
| 1 | DB schema with RLS + indexes | ✅ |
| 1 | Master Login (env creds + JWT) | ✅ |
| 2 | Master Dashboard | ✅ |
| 3 | Create School + first admin | ✅ |
| 4 | Admin Portal layout (sidebar, navbar, responsive) | ✅ |
| 5 | Admin Dashboard page | ✅ |
| 6 | Institute Profile (logo upload, update) | ✅ |
| 7 | Account Settings (currency, timezone) | ✅ |
| 8 | Rules & Regulations (employee_rules, student_rules text editor) | ✅ |
| 9 | Logout | ✅ |

### Phase 1 Architecture Decisions

- Single Next.js app (no separate backend).
- No Prisma — raw SQL migrations only.
- Custom JWT auth (HTTP-only cookies) — not Supabase Auth.
- Master login: env-driven, simple, Phase 1 only.
- School admins stored in `school_admins` with bcrypt-hashed passwords.

---

## Phase 2 — Admin Auth & Core Modules (IN PROGRESS)

**Goal:** Complete the admin auth flow and add the core ERP modules.

### 2.1 School Admin Login (COMPLETE)

- ✅ `/school-login` page (email + password, premium two-panel UI)
- ✅ API `/api/auth/school-login` — bcrypt verify, issue JWT with `school_id`
- ⏳ Forgot / reset password flow

### 2.2 Employee Management (COMPLETE)

- ✅ Employee CRUD (create, list, detail, edit, delete)
- ✅ Employee photo upload (Supabase Storage)
- ✅ Employee attachments (upload, download, delete)
- ✅ Employee active/inactive toggle
- ✅ Auto-generated employee codes (EMP-YYYY-NNNN, year from date_of_joining, resets per year) and login usernames
- ✅ Manage Login tab (username, password reset, login active toggle)
- ✅ Basic List tab (DirectoryTable with Excel export — styled with colors, borders, alternating rows; export selected, page, all, or by class)
- ✅ Attachments tab (left panel employee list, right panel upload/download/delete)
- ✅ Tab-based UI via URL `?tab=` (All, Basic List, Manage Login, Job Offer, Attachments, ID Cards)

### 2.3 ID Card Generation (COMPLETE)

- ✅ Puppeteer-based PDF generation (server-side)
- ✅ CR80 portrait card size (53.98mm × 85.6mm), 6 per A4 page
- ✅ Premium design: navy gradient header, gold accents, circular logo, gold-ring photo, STAFF ID badge
- ✅ Theme customization (accent, gold, text, bg colors)
- ✅ Client-side iframe preview + download
- ✅ Logo watermark on each card
- ✅ All/Select mode with server-side search (debounced, 300ms)
- ✅ PDF endpoint fetches only selected employees by ID (not all upfront)

### 2.4 Job Offer Letter (COMPLETE)

- ✅ `@react-pdf/renderer`-based PDF generation
- ✅ Premium navy/gold design matching ID cards
- ✅ School logo watermark (centered, fixed overlay)
- ✅ 2-page layout: employee particulars + terms of employment
- ✅ Signature blocks, acceptance callout, rules & regulations

### 2.5 Classes & Sections (IN PROGRESS)

- ✅ Class CRUD (create, list, edit, delete) — card view with boys/girls counts, progress bar
- ✅ Class fields: name, monthly fee, annual dues, class teacher, capacity
- ✅ Empty state prompts to create first class
- ⏳ Sections CRUD (assign section teachers)
- ⏳ Assign subjects to classes

### 2.6 Students (IN PROGRESS)

- ✅ Student CRUD (create, list, edit, delete, view) — card grid view with photo, class, fee
- ✅ Student fields: name, photo, registration no (auto STU-YYYY-NNNN, year from date_of_admission, resets per year), date of admission, class dropdown, discount, mobile, DOB, gender, identification mark, blood group, disease, birth form ID, additional note, orphan, OSC, is_free, previous_balance, annual_dues_discount, previous_annual_due (auto-calculated from class.annual_dues - annual_dues_discount on creation), religion, family, total siblings, address, father info
- ✅ Class dropdown loads from classes API (fee shown, net fee calculated)
- ✅ Photo upload via Supabase Storage (student-photos bucket)
- ✅ Student attachments (birth certificate, CNIC, results, etc.) — student-attachments bucket
- ✅ Search by name, registration no, father name, mobile (configurable via `searchFields`)
- ✅ Filter by class
- ✅ Filter by free education status
- ✅ View details dialog with all fields
- ✅ Excel bulk import (class selection, .xlsx file upload, styled sample Excel template with Instructions sheet; sample columns: name, registration_no, date_of_admission, date_of_birth, gender, mobile, discount, previous_balance, annual_dues_discount, previous_annual_due, is_free, birth_form_id, address, father_name, father_nic, father_profession, additional_note; removed fields auto-defaulted: is_orphan=false, is_osc=false, religion="Islam", blood_group=null, identification_mark=null, disease=null, family=null, total_siblings=0)
- ✅ Excel export (DirectoryTable — styled .xlsx with colored headers, alternating rows, borders; export selected, page, all, or by class)
- ✅ Family grouping (auto-group by father CNIC, search, expandable cards)
- ✅ Promote students (bulk promote to target class, only active students, search & select)
- ✅ Student ID Cards (Puppeteer PDF, CR80 portrait, All mode with class multi-select / Select mode with server-side search by name & reg no, theme customization, iframe preview)
- ✅ Admission Letter (`@react-pdf/renderer`, SearchPicker → full-screen PDF viewer)
- ✅ Tab-based UI via URL `?tab=` (All, Basic List, Admission Letter, Attachments, Family, Promote, ID Cards)
- ⏳ Parent linkage
- ⏳ Assign to section

### 2.7 Teachers (PENDING)

- Teacher CRUD.
- Assign subjects to teachers.

### 2.8 Parents (PENDING)

- Parent CRUD.
- Link to students.

### 2.9 Attendance (PENDING)

- Daily attendance (per class/section).
- Calendar view.
- Reports (class-wise, student-wise).

### 2.10 Exams & Grades (PENDING)

- Exam definition + grading.
- Mark entry.
- Report cards.

### 2.11 Fees (IN PROGRESS)

- ✅ Fee Particulars — configurable fee line items per school (8 defaults seeded: 5 fixed auto-resolved from class/student data, 3 custom with user-set amounts), add/edit/delete custom particulars, tab-based UI via URL `?tab=particulars`
- ✅ Invoice Generator — generate fee invoices class-wise, student-wise, or all-classes at once; auto-sequential invoice numbers (INV-MM_YYYY_NNNN, resets per month), particulars resolved from fee particulars config with discounts baked into charge amounts, PDF generation via `@react-pdf/renderer` (3 invoices per A4 page stacked vertically, black & white), search/filter/delete invoices, month filter defaults to current month, unique invoice_no for cross-module reference
- ✅ Fine handling — fine auto-resolved from fee particulars (label contains "FINE"), excluded from particulars table and total payable, stored as `fine_after_due` for display in PDF footer only; applied at payment time if late
- ✅ Duplicate prevention — generation skips students who already have an invoice for the same month
- ✅ Server-side invoice search — debounced search (300ms) by student name, registration no, father CNIC, or mobile; month filter defaults to current month; results only shown after search
- ✅ Bulk PDF download — uses filter params (search + feeMonth) instead of passing all invoice IDs in URL; scalable for 1500+ students
- ✅ Denormalized father_nic on fee_invoices for fast search without JOIN
- ✅ Annual dues handling — ANNUAL DUE particular reads from student.previous_annual_due (running balance, not class.annual_dues); ANNUAL DUES DISCOUNT already baked into previous_annual_due at creation/promotion, skipped at invoice generation to avoid double-discounting; previous_annual_due auto-set on student creation (class.annual_dues - discount) and on promotion to new class; annual_dues_original column tracks initial amount for reversal cap; annual dues filtered out when balance is 0 (fully paid for year)
- ✅ Student-wise Edit & Generate — edit dialog showing all fee particulars pre-resolved with default amounts (class fee, previous balance, annual due, discount), editable labels/amounts, add/remove line items, "To Balance" checkbox auto-ticked (adds one-time fees like admission fee to student.previous_balance after generation so they don't recur), live total calculation, FINE separated into fine_after_due, discounts applied to charge amounts (not shown as separate line items)
- ✅ Collect Fees — search invoices by name, reg no, father CNIC, mobile, or invoice number + month filter (defaults to current month); per-particular payment breakdown (partial payments per line item, e.g. pay 500 of 1000 annual due); "Allocate Full" / "Clear" quick actions (Allocate Full caps at net payable); invoice status auto-updates (unpaid → partial → paid); previous_balance reduced by amount paid toward PREVIOUS BALANCE particular + unpaid non-carried charges added; partial annual due payments reduce student.previous_annual_due; payment history per invoice; payment note field; fee_payments table records each transaction; **print invoice prompt** after successful payment (opens PDF viewer in new tab); delete payment reverses all balance changes (previous_balance restored, previous_annual_due capped at annual_dues_original)
- ✅ Discount handling — discounts (DISCOUNT IN FEE, ANNUAL DUES DISCOUNT) are baked directly into charge amounts at invoice generation time; no separate discount line items appear in invoices, PDF, or payment allocation UI; ANNUAL DUES DISCOUNT skipped at generation (already applied to previous_annual_due at creation/promotion)
- ✅ Invoice PDF — 3 invoices per A4 page (stacked vertically), particulars table with Charged/Paid/Remaining columns, Total Payable row, payment summary (Paid in this receipt, Remaining Balance), status badge, footer with month/due date/late fine
- ✅ Fee Defaulters — list students with unpaid/partial invoices; summary cards (total defaulters, outstanding amount); month filter (defaults to current month), class filter, **status filter** (Not Paid / Partial / All Status, defaults to Not Paid), debounced search (name, reg no, father CNIC, mobile, invoice no); paginated table with invoice/student/remaining details; print list button (opens print-optimized HTML in new tab); API at `GET /api/fees/[schoolId]/defaulters?statusFilter=unpaid|partial`
- ✅ Fee Report — 4 summary cards (total estimated after discount, total collected, total remaining, collection rate); month filter (defaults to current month); CSS bar chart showing collection by class (estimated vs collected overlay); class breakdown table (Class, Students, Estimated, Collected, Remaining, Collection Rate) with search + totals footer row; print report (print-optimized HTML in new tab); Excel export (xlsx-js-style with styled headers + totals row); API at `GET /api/fees/[schoolId]/report?feeMonth=YYYY-MM`
- ⏳ Fee structure per class
- ⏳ Outstanding reports

---

## Phase 3 — Billing & Scale

**Goal:** Monetize and prepare for thousands of schools.

### 3.1 Subscriptions & Billing

- Plan table (`plans`).
- Subscription per school (`subscriptions`).
- Stripe integration.
- Trial periods.
- Plan-based feature gating.

### 3.2 Portals

- Teacher portal (attendance, grades).
- Parent portal (view child's attendance, fees, grades).
- Student portal (view grades, attendance).

### 3.3 Notifications

- Email notifications (via SendGrid / Postmark).
- In-app notifications.
- SMS via Twilio (optional).

### 3.4 Reports & Analytics

- School-wide dashboards.
- Exportable reports (PDF, Excel).
- Attendance trends.
- Fee collection trends.

---

## Phase 4 — Polish & Platform

- Multi-language support (i18n).
- Dark mode (already partially wired — Tailwind darkMode class).
- Custom domain per school (white-label).
- Mobile app (React Native) — long term.
- Audit logs.
- Role-based access control (RBAC) per module.
- API rate limiting.
- Observability (Sentry + Logflare).

---

## Technical Debt to Watch

- Master login must move to a hashed DB row before scaling.
- `.env` secret keys must be moved to a secrets manager before production.
- RLS policies need tightening once school admin login is in place.
- Consider moving from custom JWT to Supabase Auth when multi-role RBAC complexity grows.
- **Puppeteer** requires Chromium on the server — ensure deployment environment supports it (or switch to `@sparticuz/chromium` for serverless).
- Two PDF libraries in use (Puppeteer + `@react-pdf/renderer`) — consider consolidating if maintenance becomes burdensome.