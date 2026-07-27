# Engraphis Local Knowledge Store
*(Note: As the MCP server is not active, this serves as the persistent memory state for the workspace)*

## Core Project Architecture
- **Workspace:** `hris-admin` (TechnoSys)
- **Role:** Full-stack HRIS, Inventory Control, Service Ticketing, and Command Center System.
- **Tech Stack:** Next.js 16 (App Router), TypeScript, TailwindCSS, Supabase SSR, Leaflet Maps, Recharts, Zod, and Shadcn UI.
- **Cross-Platform Readiness:** The Admin portal has `@capacitor` dependencies and configuration (`capacitor.config.ts`), suggesting it can be compiled natively if needed.

## Comprehensive Codebase Features

### 1. Command Center & Real-time Live Tracking (`/dashboard`, `/dashboard/live-map`)
- **Dashboard Metrics:** Live KPIs using `Recharts` (`DashboardCharts.tsx`) covering active field capacities, scheduled dispatches, and statutory counts.
- **Map & Geocoding:** Integrates Leaflet (`MapAutocomplete.tsx`, `LocationMarkerInner.tsx`) with realtime Supabase sync (`GlobalRealtimeSync.tsx`).
- **Audit Logging:** Logs all administrative actions and displays them in `/dashboard/activity`.

### 2. Deep HR, Compliance & Employee Management
- **Employee Directory:** (`/dashboard/employees`) Full CRUD, profile activation/deactivation, and role assignments.
- **Payroll & Taxes:** (`ph-taxes.ts`, `/dashboard/payroll`) Complex PH statutory computations (SSS, PhilHealth, Pag-IBIG).
- **Time & Attendance:** (`/dashboard/attendance`) Supports tracking modes (HQ vs. Direct Dispatch), DTR overrides (`overrides.ts`), and auditing of `DTR Selfies` (`SelfieAuditWidget.tsx`).
- **Leaves & Overtime:** (`/dashboard/leaves`, `overtime.ts`) Full workflows for requesting and approving Leaves, Holidays, and Overtime.
- **Disciplinary/Warnings:** (`/dashboard/warnings`) Issuing memos and warnings to employees.
- **Role-Based Access Control (RBAC):** (`permissions.ts`, `permissions-client.ts`) Distinguishes between Standard Admins (read-only compliance) and Super Admins (system modifications).

### 3. Geofencing & Location Synchronization
- **Geofence Registry:** Adds and configures branch coordinates/radiuses.
- **Location Sync:** Includes Supabase migrations for location syncing and live tracking, storing GPS coordinates of technicians in the field.

### 4. Advanced Operational Modules
- **Service Desk / Ticketing:** (`/dashboard/tickets`) Ticket creation, chat logs, and hooks for item checkout dispatching.
- **Inventory & Stocktake Control:** (`/dashboard/inventory`) Item ledger tracking, restocks, low-stock alerts, and manual physical audits with automated variance posting.
- **Broadcasting, SMS & Push:** (`/dashboard/broadcaster`, `announcements.ts`, `push.ts`) Gateway for App Distribution, company-wide announcements, Push Notifications, and Semaphore SMS API integration.

### 5. Backend Scripts & Database Operations
- Contains numerous migrations spanning `Phase 1` through `Phase 10` covering RLS, geofencing, inventory remakes, GCash antispam, DTR selfies, holidays, phone auth, and more.
- Contains operational python/js scripts (`add_tasks_jira.js`, `seed.js`, `fix_attendance.py`, `check-phase8-tables.js`) used for automation, jira integration, and DB seeding.

## Authentication & Security Flow
- **Admins:** Log in via Email and Password for secure backend access (with `login-client-wrapper.tsx` and `login-form.tsx`).
- **Technicians:** Transitioning to Phone Number + OTP (Semaphore SMS) for mobile app login.
- **OTP Implementation:** E.164 phone sanitization (`+63`), 60-second cooldown, hidden email fallback, and long-lived 30-day sessions via Supabase.

## Agent Directives
- **Rule:** If a new feature is added to the system, it MUST be recorded in the Engraphis memory engine to maintain context across sessions.
