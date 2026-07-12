# Roadmap

## Phase 1 — Foundation & Core Portal (CURRENT)

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

## Phase 2 — Admin Auth & Core Modules

**Goal:** Complete the admin auth flow and add the core ERP modules.

### 2.1 School Admin Login

- `/school-login` page (email + password).
- API `/api/auth/school-login` — bcrypt verify, issue JWT with `school_id`.
- Forgot / reset password flow.

### 2.2 Classes & Sections

- CRUD for classes and sections.
- Assign section teachers.

### 2.3 Students

- Student CRUD (import / export CSV).
- Profile photo upload (Supabase Storage).
- Assign to class/section.
- Parent linkage.

### 2.4 Teachers

- Teacher CRUD.
- Assign subjects to teachers.

### 2.5 Parents

- Parent CRUD.
- Link to students.

### 2.6 Attendance

- Daily attendance (per class/section).
- Calendar view.
- Reports (class-wise, student-wise).

### 2.7 Exams & Grades

- Exam definition + grading.
- Mark entry.
- Report cards.

### 2.8 Fees

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