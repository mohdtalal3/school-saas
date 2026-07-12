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
| 8 | Logout | ✅ |

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
- ✅ Auto-generated employee codes and login usernames

### 2.3 ID Card Generation (COMPLETE)

- ✅ Puppeteer-based PDF generation (server-side)
- ✅ CR80 portrait card size (53.98mm × 85.6mm), 6 per A4 page
- ✅ Premium design: navy gradient header, gold accents, circular logo, gold-ring photo, STAFF ID badge
- ✅ Theme customization (accent, gold, text, bg colors)
- ✅ Client-side iframe preview + download
- ✅ Logo watermark on each card

### 2.4 Job Offer Letter (COMPLETE)

- ✅ `@react-pdf/renderer`-based PDF generation
- ✅ Premium navy/gold design matching ID cards
- ✅ School logo watermark (centered, fixed overlay)
- ✅ 2-page layout: employee particulars + terms of employment
- ✅ Signature blocks, acceptance callout, rules & regulations

### 2.5 Classes & Sections (IN PROGRESS)

- ✅ Class CRUD (create, list, edit, delete) — card view with boys/girls counts, progress bar
- ✅ Class fields: name, monthly fee, class teacher, capacity
- ✅ Empty state prompts to create first class
- ⏳ Sections CRUD (assign section teachers)
- ⏳ Assign subjects to classes

### 2.6 Students (IN PROGRESS)

- ✅ Student CRUD (create, list, edit, delete, view) — card grid view with photo, class, fee
- ✅ Student fields: name, photo, registration no (auto), date of admission, class dropdown, discount, mobile, DOB, gender, identification mark, blood group, disease, birth form ID, additional note, orphan, OSC, religion, family, total siblings, address, father info
- ✅ Class dropdown loads from classes API (fee shown, net fee calculated)
- ✅ Photo upload via Supabase Storage (student-photos bucket)
- ✅ Student attachments (birth certificate, CNIC, results, etc.) — student-attachments bucket
- ✅ Search by name, registration no, father name, mobile
- ✅ Filter by class
- ✅ View details dialog with all fields
- ⏳ CSV import / export
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

### 2.11 Fees (PENDING)

- Fee structure per class.
- Invoice generation.
- Payment recording.
- Outstanding reports.

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