# TechnoSys Admin Portal 🛡️

A premium, dynamic enterprise HRIS & Inventory Management portal built using Next.js 15, Tailwind CSS, and Supabase. This console acts as the command center for field service coordination, geofenced tracking, statutory payroll engine management, service ticketing support, and stocktake auditing.

---

## 🚀 Key Modules & System Architecture

### 1. Command Center (Overview Dashboard)
* **Real-time Metrics:** Displays active field capacities, scheduled dispatches, and statutory counts.
* **Separation of Concerns:** Administrators are excluded from capacity metrics; the statistics focus purely on active field technicians.
* **Database Resilient:** Covered by client and server-side try-catch safety boundaries, rendering detailed warning banners if table connections fail.

### 2. Employee & Admin Account Management
* **Technician Directory:** Active listings of all field personnel showing emails, registration dates, and base salaries. Includes a double-confirmation delete cascade (removing the Auth account automatically purges profiles).
* **Super Admin Privilege Separator:** 
  - Standard admins have **Read-Only** access to system settings (geofences, compliance SSS parameters).
  - Super Admins get access to the **Access Management Workspace** to register standard `admin` accounts and modify system parameters.
  - Resilient to schema resets (re-syncs Auth accounts with newly initialized profiles).

### 3. Statutory Payroll Compliance Engine
* Computes monthly credits, employee/employer shares, SSS brackets, PhilHealth (5% dynamically split), and Pag-IBIG caps.
* Includes manual and server-action rule editors locked behind Super Admin roles.

### 4. Geofencing Registry
* Add and toggle branch coordinates (latitude, longitude) and circular allowed clock-in radiuses. Standard admins have read-only views, while Super Admins can add or deactivate branches.

### 5. Service Desk & Ticketing
* Real-time employee ticketing workspace with split-pane support chat logs and item checkout dispatch hooks.

### 6. Inventory Control & Physical Reconciliation Audits
* Full items ledger tracking, restocks, low-stock alerts, and manual physical audits.
* Automated variance ledger posting: physical discrepancies write correcting adjustments automatically.

---

## 🛠️ Getting Started: Developer Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.x or later)
* **npm** (v9.x or later)

### 2. Clone the Repository
```bash
git clone https://github.com/Azirielle/technosys-admin.git
cd technosys-admin
```

### 3. Environment Configurations
Create a `.env.local` file in the root of the project with the following Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### 4. Database Setup & Migrations
Before running the server, verify you have executed the schema scripts in the **Supabase SQL Editor** in the following order:
1. `supabase_schema.sql` (Creates profiles, base tables, and types)
2. `supabase_migration_complete.sql` (Enables ticketing, comments, and RLS)
3. `supabase_migration_unified_v4.sql` (Enables GPS logs audit fields and inventory audit schema)
4. `supabase_migration_super_admin.sql` (Extends roles to support Super Admins, modifies RLS, and promotes the primary owner profile)

*Note: In PostgreSQL, step 4 must be run in two stages (first run the enum `ALTER TYPE` command alone, then run the policy updates).*

### 5. Seed Compliance Database
Run the local seed script to populate Philippine statutory rules (SSS, PhilHealth, Pag-IBIG rates):
```bash
npm run seed
```
*(This triggers `node seed.js` using credentials in `.env.local`)*

### 6. Run Local Development Server
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the Admin Console.

---

## 🧪 Validation & Type-safety
The codebase enforces strict type safety. Run compile checks prior to committing:
```bash
npx tsc --noEmit
```
