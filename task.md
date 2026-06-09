# TechnoSys Project Kanban & Devlog

## 📋 Kanban Board

### 🟢 DONE
- [x] Initial repository setup (Admin Next.js, Mobile Expo).
- [x] Supabase backend initialized.
- [x] Auth and Login flow.
- [x] Basic Employee Registration (Admin).
- [x] Philippine Payroll Tax Engine (SSS, PhilHealth, Pag-IBIG).
- [x] Basic Scheduling & Dispatch.
- [x] Geofencing: Mobile GPS Integration.
- [x] Geofencing: Admin Location Setup.
- [x] Service Ticketing Module (Admin split-pane, mobile desk & chat).
- [x] **Unified Roadmap, UI/UX Audit & Error Polish** (Phase 3)
  - [x] **Database Migration**: Create `supabase_migration_unified_v3.sql` for inventory tables, transaction logs, and time log updates.
  - [x] **Priority 1: HR Complete (Attendance/Payroll)**:
    - [x] Mobile: Add Time-Out action, clock-out geofencing, and duration calculator.
    - [x] Admin: Update payroll feed to display hours worked and link to pay slips.
  - [x] **Priority 2: Generalize Geofences (Multiple Offices)**:
    - [x] Admin: Redesign settings UI to display, add, and toggle active branch coordinates.
    - [x] Mobile: Modify `useGeofence.ts` to iterate through all active locations.
  - [x] **Priority 3: Inventory Control**:
    - [x] Admin: Create inventory listings dashboard, low stock thresholds, and stock ledgers.
    - [x] Mobile: Add parts consumption drawers directly in `TicketsTab.tsx`.
  - [x] **UI/UX Refinements (Impeccable guidelines)**:
    - [x] Audit contrast ratio of category/status badges to ensure they hit >=4.5:1.
    - [x] Polish visual container highlights (remove card border tells, fix typography limits).
    - [x] Implement clean data loading/empty/error states.
    - [x] Implement an animated opening splash screen transition for mobile app loading.
    - [x] Fix admin dashboard navigation menu active highlighting bug using client-side usePathname check.
  - [x] **Comprehensive Error Handling**:
    - [x] Wrap all admin server actions and api routes in try...catch blocks.
    - [x] Wrap all mobile async Supabase fetches, coordinates trackers, and auth calls in try...catch blocks with Alert popups.

- [x] **GEOFENCED IMS Research Gaps (Phase 4)**
  - [x] **GPS Integrity & Spoofing Detection**:
    - [x] Mobile: Check `location.mocked` flag and `coords.accuracy` (> 50m) in `useGeofence.ts`.
    - [x] Schema: Store `is_mocked` and `accuracy` fields in `time_logs` (defined in `supabase_migration_unified_v4.sql`).
    - [x] Server: Verify device-database timestamp synchronization.
  - [x] **Offline Queue & Synchronization**:
    - [x] Mobile: Implement `AsyncStorage` transaction store for offline DTR logs and checkout events in `syncQueue.ts`.
    - [x] Mobile: Add automatic polling checker to flush the queue chronologically on reconnect.
  - [x] **Inventory Audits & Reconciliation**:
    - [x] Schema: Create `inventory_audits` and audit discrepancies ledger.
    - [x] Admin: Build reconciliation spreadsheet interface for quarterly audits and auto-adjustments.

- [x] **HR Enhancements (Phase 5)**
  - [x] Leaves management and approval.
- [x] **Super Admin & Metrics Correction (Phase 5 Extension)**
  - [x] Create database migration `supabase_migration_super_admin.sql` to extend `user_role` type, update RLS policies, and promote admin `technosis@admin.com` to `super_admin`.
  - [x] Update dashboard metrics and recent technicians queries to only count technicians.
  - [x] Add server actions to manage admins (`getAdmins`, `createAdmin`, `deleteAdmin`).
  - [x] Add server actions security check for compliance/geofence write operations.
  - [x] Update settings page to fetch logged-in user role and lock forms down for non-super admins.
  - [x] Create `AdminAccounts.tsx` UI and render it in Settings only for `super_admin`.

### 🟢 DONE
- [x] **Offline-First Caching & Query Timeout Guards (Phase 5 Extension)**
  - [x] Create `timeout.ts` network timeout helper in mobile client.
  - [x] Implement office locations local caching in `useGeofence.ts`.
  - [x] Implement query timeout and local caching fallback in `TicketsTab.tsx`.
  - [x] Implement query timeout and local caching fallback in `LeavesTab.tsx`.
  - [x] Implement query timeout and local caching fallback on the dashboard page (`index.tsx`).
  - [x] Verify compilation and test offline flows.
- [x] **UI/UX Audit & Motion Transition Refinements (Phase 6)**
  - [x] Refine Mobile Transitions (`hris-mobile/src/app/index.tsx`):
    - [x] Update `FadeInView` to slide elements up (`translateY` from 8 to 0) using spring-loaded translation alongside opacity fade-in.
    - [x] Render a subtle active dot indicator (`backgroundColor: COLORS.primary`) below the active bottom navigation bar icons.
  - [x] Refine leaves reason card formatting (`hris-mobile/src/components/TicketsTab.tsx`):
    - [x] Replace leaves reason container `#ffffff` background and border card style with a borderless left-padded tinted box with curly typographic quotes.
  - [x] Implement JSON ticket description parsing (`hris-admin/src/app/dashboard/tickets/TicketWorkspace.tsx`):
    - [x] Implement description rendering helper to format JSON fields (disputed amount, month, serial number, etc.) in a bento grid.
    - [x] Add `getDisplayDescription` in the ticket list sidebar to clean up raw JSON text leaks in the sidebar.
  - [x] Implement leaves reason formatting (`hris-admin/src/app/dashboard/leaves/LeavesWorkspace.tsx`):
    - [x] Replace nested border cards around leave reasons with borderless tinted boxes and curly quotes.
  - [x] Fix active tickets server action filter check (`hris-admin/src/app/actions/tickets.ts`):
    - [x] Modify `getTickets` to map `"active"` and `"open_assigned"` to `['open', 'assigned', 'in_progress']`.

- [x] **Org Chart, RBAC, Expanded Leaves & Compliance (Phase 7)**
  - [x] Apply database schema updates (`supabase_migration_phase7.sql`):
    - [x] Create/update user roles enum.
    - [x] Add columns for regularization, 201 checklists, and leaves constraints.
  - [x] Implement mobile leaves classifications and timesheets checkouts (`hris-mobile`):
    - [x] Add new leave types inside `TicketsTab.tsx`.
    - [x] Create DTR History log view.
  - [x] Implement Admin Side components and server actions (`hris-admin`):
    - [x] Add manual DTR overrides action and supervisor layout updates.
    - [x] Update layouts to enforce role-based access checks (RBAC).
    - [x] Build 201 compliance checklists in `EmployeesClient.tsx`.

- [x] **Profile UI/UX Redesign & Tagalog Language Support**
  - [x] Create translation dictionary file `translations.ts` containing English & Tagalog definitions.
  - [x] Add `language` state and storage loaders in mobile client `index.tsx`.
  - [x] Redesign Profile screen layout to use avatar header banner and settings row groups.
  - [x] Build segmented EN / FIL control widget with spring highlights.
  - [x] Update Home DTR widgets and modals to support translation.
  - [x] Propagate translations to `TicketsTab.tsx` leave/dispute forms and categories list.
  - [x] Verify typescript compilation passes with 0 errors.

- [x] **Secure Offline Authentication Caching with 24-Hour TTL**
  - [x] Install `expo-secure-store` and `expo-local-authentication` dependencies.
  - [x] Implement secure session credentials caching using `SecureStore` in `index.tsx`.
  - [x] Implement the 24-hour TTL (Time-To-Live) cache purge logic.
  - [x] Implement biometrics-gated offline onboarding screen entry fallback.
  - [x] Verify TypeScript compiles with 0 errors.
- [x] **Dynamic Offline Network Detection & Cache Fallbacks**
  - [x] Add web window online/offline listeners to dynamically toggle app status instantly.
  - [x] Wire `isOnline` status to Profile and System cards connection indicators.
  - [x] Refactor dashboard data, monthly DTR history logs, leaves, tickets, and inventory fetches to bypass network queries when offline and load directly from local cache.
  - [x] Update sync loop to check online status periodically.
- [x] **Interactive Geofence Map Editor (Admin & Mobile)**
  - [x] Admin Geofence Map Settings: Implement Leaflet map wrapper with draggable marker pin, real-time radius circle, geocoding search, and coordinate binding.
  - [x] Mobile Geofence Map Visualizer: Build react-native-maps visualizer showing current location and office radius.
  - [x] Nominatim filters: Scope search to Philippines and coordinate/URL paste formats.

- [x] **Phase 8: Geofenced Two-Factor Biometric Attendance & JIRA/Kanban Gaps**
  - [x] **Database Setup & Migrations (Phase 8)**
    - [x] Create `supabase_migration_phase8.sql` with `physical_biometric_scans`, announcements, holidays tables, and `branch_id` profiles column.
  - [x] **Two-Factor Biometric Mobile Integration**
    - [x] Mobile: Update `translations.ts` with biometrics and forms labels.
    - [x] Mobile: Add real-time Supabase subscription for physical fingerprint scan in `index.tsx`.
    - [x] Mobile: Build pulsating biometric overlay scanner modal for Clock-In & Clock-Out flows.
  - [x] **Admin Terminal Simulation Panel**
    - [x] Admin: Build a physical biometric scan simulator in the Admin Overview page (`page.tsx`) to trigger fingerprint sweeps for testing.
  - [x] **JIRA Gaps: Branch Data Isolation (RBAC)**
    - [x] Admin: Filter employee registries and schedules by `branch_id` if logged-in user is a supervisor.
    - [x] Admin: Add branch selection dropdown in employee register.
    - [x] Admin: Display real-time employee status dashboard ("Active now", "Off-duty", "On-leave").
  - [x] **JIRA Gaps: Lifecycle & Document Management System (DMS)**
    - [x] Admin: Implement employee lifecycle status CRUD (`active`, `on_leave`, `terminated`, `archived`).
    - [x] Mobile: Build simulated document/form downloader inside Profile settings.
  - [x] **JIRA Gaps: Announcements Broadcasting**
    - [x] Admin: Create broadcasting card for company-wide/branch-specific messages.
    - [x] Mobile: Render a marquee/carousel widget on the mobile Home screen.
  - [x] **JIRA Gaps: Holidays Calendar & Multipliers**
    - [x] Admin: Create holidays list and editor settings UI.
    - [x] Admin: Update payroll calculation engine to check holidays table and apply the 1.30x (or holiday-specific) multiplier.

### 🟢 DONE
- [x] **Interactive Geofence Map Editor (Admin & Mobile)**
  - [x] **Admin Geofence Map Settings (`hris-admin`)**:
    - [x] Install Leaflet dependencies (`leaflet`, `react-leaflet`, `@types/leaflet`).
    - [x] Add Leaflet CSS import in `global.css`.
    - [x] Implement Leaflet map wrapper with draggable marker pin, real-time radius circle, geocoding search input, and map click handlers.
    - [x] Connect map state to branch settings forms (automatic latitude/longitude/radius binding).
    - [x] Sync map view when selecting locations from the registry table.
    - [x] Validate TypeScript compilation and build success.
  - [x] **Mobile Geofence Map Visualizer (`hris-mobile`)**:
    - [x] Install map-compatible components for mobile (`react-native-maps`).
    - [x] Build a geofence overlay map inside the mobile clock-in/out container showing the technician's GPS coordinate, the branch office geofence circle, and their distance relative to the boundaries.
    - [x] Validate mobile client typescript compilation.

---

## 📓 Devlog

### [2026-06-01 13:08] Phase 3: Unified Roadmap & Polish — STARTED 🟡
- Initiated implementation plan for Phase 3: DTR completion, multi-location geofences, inventory dashboard/mobile integration, UI/UX audit, and error boundaries.

### [2026-06-01 13:16] Phase 3: Unified Roadmap & Polish — COMPLETED 🟢
- Verified build compatibility of both Next.js admin web panel and React Native Expo client (0 TypeScript compile errors).
- Wrote and verified comprehensive mock-based test suite checking DTR duration calculations, multi-location geofence checks, and stock consumption alert thresholds.
- Fixed badge contrast ratios in TicketsTab.tsx to comply with AA standards (>=4.5:1).
- Corrected VIP scheduling card contrast styling on index.tsx for the white theme.
- Updated admin panel payroll engine to calculate gross pay dynamically using logged DTR hours worked and displayed it as a dedicated column in the admin interface.

### [2026-06-01 14:00] Mobile Splash Screen Transition — COMPLETED 🟢
- Designed and built a premium, animated splash screen overlay in the mobile client (`hris-mobile`).
- Configured a parallel animation entry (fade-in & spring scale-up of the company logo, slide-up and fade-in of the branding/tagline text, with a subtle activity indicator).
- Added automatic 1-second delay hold followed by a 500ms fade-out of the splash overlay, masking background data loading and session initialization.
- Validated build correctness with TypeScript (0 errors).

### [2026-06-01 14:10] Admin Layout Navigation Highlight Bugfix — COMPLETED 🟢
- Converted `src/app/dashboard/layout.tsx` to a client component using `"use client"`.
- Replaced hardcoded "Overview" link highlighting with a dynamic check using `usePathname()` from Next.js.
- Implemented robust exact and prefix-based routing checks so current views (Overview, Schedules, Employees, Settings, etc.) accurately display the high-contrast emerald indicator styles.
- Checked and verified that typescript compilation is fully successful.

### [2026-06-01 14:15] GEOFENCED IMS Gaps Planning (LLM Council) — COMPLETED 🟢
- Summoned LLM Council to outline the implementation roadmap addressing academic research gaps: GPS spoofing/integrity, offline-first transaction queueing, and admin stock reconciliation.
- Formulated the phase checklist containing concrete tasks: client-side `isMocked` validation, AsyncStorage batch logs buffering, and DB schemas for manual inventory adjustments.
- Logged the plans in the master project board (`task.md`).

### [2026-06-01 14:35] GEOFENCED IMS Research Gaps (Phase 4) — COMPLETED 🟢
- **GPS Integrity:** Implemented mock location provider blocks (`location.mocked`) and signal accuracy validations (> 50m) in `useGeofence.ts` with explicit type safety.
- **Offline Mode:** Created AsyncStorage transaction caching queue (`syncQueue.ts`) that intercepts network errors and buffers offline DTR actions and parts checkouts locally.
- **Offline Sync engine:** Wired background polling tasks that sequential-flushes the queue chronologically (FIFO) on connection restoration and updates UI local caches instantly.
- **Audit Trails:** Structured SQL ledger migrations for `inventory_audits` and built the admin physical count stocktake spreadsheet under `/dashboard/inventory` with color-coded variance markers.
- Checked and verified that typescript compilation is fully successful.

### [2026-06-01 14:40] Auth Resilience, Employee Directory & Safeguards (Phase 5) — COMPLETED 🟢
- **Auth Re-Sync:** Fixed registration endpoint to gracefully detect preexisting Auth users whose profile table rows were missing, re-syncing metadata, updating passwords, and restoring `profiles` rows.
- **Employee Directory:** Replaced static admin employees layout with a fully server-side rendered dashboard directory showing active technicians, names, emails, salaries, registration dates, and cascaded account deletion actions.
- **Metrics Error Boundaries:** Wrapped command center overview selectors in try-catch structures and designed alert warning banners in the UI to handle database timeouts or missing migrations.
- Checked and verified that typescript compilation in both repositories is fully successful.

### [2026-06-01 22:22] Leaves Management & Approval System (Phase 5) — COMPLETED 🟢
- **Database Schema:** Created migration `supabase_migration_leaves.sql` with checking constraints and RLS isolation.
- **Admin Workspace:** Built server-side overlap checks and dynamic cards sorting with list status tags and schedule warning overrides in `LeavesWorkspace.tsx`.
- **Mobile app integration:** Developed `LeavesTab.tsx` with preset range calculators and combined live/offline queue items lists rendering.
- Checked and verified that typescript compilation is fully successful in both repositories.

### [2026-06-02 19:25] UI/UX Audit & Motion Transition Refinements (Phase 6) — COMPLETED 🟢
- **Mobile Transition Enhancements:** Upgraded `FadeInView` to parallel slide elements up (`translateY` from 8 to 0) using spring-loaded translation curves (`Animated.spring`) alongside linear opacity fade-ins.
- **Bottom Navigation State Indicators:** Rendered subtle active dot markers centered below active icon/label items.
- **Typography & Nested Card Removal:** Replaced leaves reason bordered white cards with borderless, padded neutral containers using typographic curly quotes (`“` and `”`) in both mobile client history list and admin leaves manager list.
- **JSON Ticket Parsing:** Implemented dynamic description parser inside admin `TicketWorkspace.tsx` to automatically render structured custom category ticket data (e.g. payroll disputes, equipment issues) in clean grid layouts instead of raw stringified JSON text. Added list display description helpers to remove raw JSON text leaks in the sidebar.
- **Active Tickets server query:** Fixed the server action status check to map `"active"` and `"open_assigned"` to `['open', 'assigned', 'in_progress']`, correcting the issue where the page loads zero tickets initially.

### [2026-06-02 20:30] Org Chart, RBAC, Expanded Leaves & Compliance (Phase 7) — COMPLETED 🟢
- **Database Schema:** Created migration `supabase_migration_phase7.sql` to add enums, metadata columns (manager, hire date, status), and 201 checklists.
- **Mobile Client:** Added DTR monthly history logs and "Manual Entry" override tagging, fixed the `extrabold` font-weight issue, and expanded the leave request selector for wedding/paternal/maternal enums.
- **Admin Dashboard:** Implemented role-based sidebar layout filtering using client-side role fetching, a side panel console drawer for 201 checklist saves and manual DTR time log overrides, and extended leaves workspace style support.
- Checked and verified that typescript compilation is fully successful in both repositories.

### [2026-06-02 20:38] Git Branch Configuration Renaming — COMPLETED 🟢
- **Branch Renaming**: Renamed local feature branch from `feature/phase7-rbac-dtr` to `andrew/phase7-rbac-dtr` across both repositories (`hris-admin` and `hris-mobile`).
- **Documentation Update**: Updated `implementation_plan.md` and `walkthrough.md` to reference the correct renamed branch `andrew/phase7-rbac-dtr`.

### [2026-06-02 21:15] Sidebar Cleanup & Assignee Restrictions — COMPLETED 🟢
- **Sidebar Menu Navigation**: Removed the redundant "Leaves" tab from the admin navigation layout (`layout.tsx`), as leaves are managed inside support tickets.
- **Assignee List Filtering**: Refined the `getStaffList` function inside `tickets.ts` to only retrieve operational staff roles (`admin`, `coordinator`, `supervisor`, `hr', `accountant`) in the assignee dropdown, preventing high-level executives (`super_admin`, `ceo`, `coo`, etc.) and field technicians/helpers from being listed as assignees.

### [2026-06-02 21:18] Query Enum Typecast Resiliency — COMPLETED 🟢
- **Database Resiliency**: Refactored `getStaffList` in `tickets.ts` and `getTechnicians` in `employees.ts` to perform operational/field role filters in memory on the JavaScript side rather than passing role arrays directly to the PostgreSQL query builder.
- **Error Mitigation**: This resolves the enum validation issue `invalid input value for enum user_role: "coordinator"` or `"helper"`, preventing runtime crashes when querying tables before database migrations are executed in the Supabase SQL editor.

### [2026-06-02 21:32] Profile Redesign & Tagalog Language Support — COMPLETED 🟢
- **Profile Redesign**: Replaced centered card with premium avatar header row and grouped settings cards (Account, Preferences, System).
- **Language Support**: Implemented `translations.ts` mapping English and Tagalog UI text. Added interactive Segmented Control language switch widget in Profile screen with active spring slide indicator.
- **Propagation**: Localized Home DTR widgets, active shift logs, monthly DTR history modal, and Support/Tickets categories, inputs, and actions in `TicketsTab.tsx`.
- **Validation**: Compiled successfully with 0 TypeScript compilation errors (`npx tsc --noEmit`).

### [2026-06-02 22:36] Secure Offline Cache & biometric gating — COMPLETED 🟢
- **Dependencies**: Installed `expo-secure-store` and `expo-local-authentication`.
- **Credential Storage**: Replaced unencrypted storage of user credentials with secure encrypted `SecureStore` values (`USER_SESSION`).
- **Offline TTL limit**: Implemented 24-hour cache limit. If the device last contacted the database more than 24 hours ago, the app automatically purges all cached tokens, sessions, and dashboard details and redirects the user to the online login screen.
- **Biometric Gate**: Integrated a biometric lock screen gating layer. If the user is offline but their cached session is within 24 hours, FaceID/TouchID/passcode is required to unlock the app workspace.
- **Validation**: Verified build compatibility using `npx tsc --noEmit` returning 0 errors.

### [2026-06-02 23:45] Dynamic Offline Network Detection & Cache Fallbacks — COMPLETED 🟢
- **Web listeners**: Integrated window online/offline event listeners to immediately toggle `isOnline` status on browser network changes.
- **Dynamic badges**: Connected Profile and System settings badges to show dynamic colors and Tagalog/English translation text.
- **Pre-emptive caching**: Configured dashboard, monthly DTR logs, support tickets, comments, leaves, and parts checkout inventory queries to check online status first, loading from AsyncStorage cache when offline instead of triggering failing Supabase fetch requests.
- **Validation**: Verified successful typescript builds with 0 errors.
