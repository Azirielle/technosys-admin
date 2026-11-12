-- ==============================================================================
-- Migration: 20261017000000_technocycle_policies.sql
-- Description: Provision company_policies and policy_acknowledgments tables,
--              Row Level Security with InitPlan subquery caching,
--              and seed the 6 official TechnoCycle Corporation enterprise policies.
-- ==============================================================================

-- 1. Create company_policies table
CREATE TABLE IF NOT EXISTS public.company_policies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('legal', 'field_ops', 'hr_attendance', 'inventory', 'executive')),
    version TEXT NOT NULL DEFAULT 'v1.0.0',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'technician', 'admin')),
    summary TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create policy_acknowledgments table
CREATE TABLE IF NOT EXISTS public.policy_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    policy_id TEXT NOT NULL REFERENCES public.company_policies(id) ON DELETE CASCADE,
    policy_version TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    CONSTRAINT unique_user_policy_version UNIQUE (user_id, policy_id, policy_version)
);

-- 3. Provision Indexes for Query Optimization
CREATE INDEX IF NOT EXISTS idx_company_policies_active 
    ON public.company_policies(is_active, target_audience);

CREATE INDEX IF NOT EXISTS idx_company_policies_category 
    ON public.company_policies(category);

CREATE INDEX IF NOT EXISTS idx_policy_acks_user 
    ON public.policy_acknowledgments(user_id);

CREATE INDEX IF NOT EXISTS idx_policy_acks_policy 
    ON public.policy_acknowledgments(policy_id, policy_version);

-- 4. Enable Row Level Security
ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acknowledgments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies on company_policies
-- 5.1 Public (anon + authenticated) read on active legal policies (Terms & Privacy) for login portal
DROP POLICY IF EXISTS "Public read for legal policies" ON public.company_policies;
CREATE POLICY "Public read for legal policies" ON public.company_policies
    FOR SELECT TO anon, authenticated
    USING (is_active = true AND id IN ('terms_of_service', 'privacy_policy'));

-- 5.2 Authenticated read on all active policies
DROP POLICY IF EXISTS "Authenticated read all active policies" ON public.company_policies;
CREATE POLICY "Authenticated read all active policies" ON public.company_policies
    FOR SELECT TO authenticated
    USING (is_active = true);

-- 5.3 Admin and HR can manage policies
DROP POLICY IF EXISTS "Admins and HR can manage policies" ON public.company_policies;
CREATE POLICY "Admins and HR can manage policies" ON public.company_policies
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'ceo'::user_role, 'hr'::user_role])
    ));

-- 6. RLS Policies on policy_acknowledgments
-- 6.1 Users can view their own acknowledgments
DROP POLICY IF EXISTS "Users can view own acknowledgments" ON public.policy_acknowledgments;
CREATE POLICY "Users can view own acknowledgments" ON public.policy_acknowledgments
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- 6.2 Users can insert their own acknowledgments
DROP POLICY IF EXISTS "Users can insert own acknowledgments" ON public.policy_acknowledgments;
CREATE POLICY "Users can insert own acknowledgments" ON public.policy_acknowledgments
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- 6.3 Admins and HR can view all acknowledgments for audit purposes
DROP POLICY IF EXISTS "Admins and HR can view all acknowledgments" ON public.policy_acknowledgments;
CREATE POLICY "Admins and HR can view all acknowledgments" ON public.policy_acknowledgments
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'ceo'::user_role, 'hr'::user_role])
    ));

-- 7. Seed Official TechnoCycle Corporation Enterprise Policies
INSERT INTO public.company_policies (
    id, title, category, version, effective_date, target_audience, summary, content_markdown, is_mandatory, is_active
) VALUES 
(
    'terms_of_service',
    'TechnoSys Enterprise Platform Terms and Conditions of Use',
    'legal',
    'v1.0.0',
    CURRENT_DATE,
    'all',
    'Governs authorized platform access for all personnel. Mandates credential confidentiality, strictly duty-bound GPS tracking during active shifts, front-camera selfie verification, and limitation of software liability.',
    '# TECHNOSYS PLATFORM TERMS AND CONDITIONS OF USE
**Effective Date:** October 17, 2026 | **Version:** 1.0.0  
**Governing Entity:** TechnoCycle Corporation (Pacita Complex, San Pedro, Laguna, Philippines)

---

### 1. Corporate Scope & Binding Agreement
This Terms and Conditions of Use ("Terms") constitutes a legally binding enterprise agreement between TechnoCycle Corporation ("Company", "TechnoCycle") and all authorized users—including Field Technicians, Casual/Regular Helpers, Field Operations Coordinators, HR Officers, Accountants, and Executive Staff—accessing the TechnoSys Mobile Application ("Mobile Kiosk") and Next.js Web Administration Portal ("Admin Command Center").

By accessing, authenticating, or executing operational tasks on TechnoSys, you confirm that you have read, understood, and agreed to be bound by these Terms and the Company Code of Conduct.

---

### 2. Authorized Access & Credential Integrity
1. **Designated User Accounts:** Access is restricted exclusively to active employees and authorized contractors of TechnoCycle. Account sharing, lending credentials, or logging in on behalf of another individual ("proxy access") is strictly prohibited.
2. **Anti-Proxy Punching Mandate:** Technicians must independently record their attendance. Assisting, coordinating, or allowing another employee to record attendance ("buddy punching") constitutes serious misconduct and ground for disciplinary dismissal under Article 297 of the Labor Code of the Philippines.
3. **Session Revocation:** The Company reserves the right to terminate active sessions or disable accounts immediately upon detection of anomalous authentication, credential compromise, or employment separation.

---

### 3. Shift-Bound Telemetry, Geofencing & Camera Affordances
1. **Duty-Bound Telemetry:** TechnoSys collects device GPS coordinates, network provider metadata, and battery telemetry **strictly while a shift dispatch is actively open**. 
2. **Shift Termination of Tracking:** All location polling terminates immediately upon shift clock-out. TechnoSys does not monitor, track, or record employee geographic coordinates outside authorized working hours.
3. **Selfie Verification:** To validate physical presence at designated client facilities (e.g., Toyota, Honda, Laguna Technopark) and overcome GPS drift, technicians agree to submit a live camera selfie at clock-in. Gallery uploads and image manipulation are programmatically disabled.

---

### 4. Acceptable Use & Anti-Tamper Restrictions
Users agree NOT to:
- Utilize GPS spoofing software, mock location mockers, emulator hooks, or root/jailbreak bypasses to fabricate attendance coordinates.
- Reverse-engineer, decompile, intercept WebSocket event streams, or tamper with Supabase Realtime pub/sub channels.
- Upload malicious payloads, corrupted attachments, or unauthorized media to the Help Desk or 201 dossiers.

Any attempt to falsify geographic or biometric telemetry will trigger an automated entry in `public.fraud_audit` and initiate formal HR disciplinary procedures.

---

### 5. Offline Operation & Asynchronous Sync Resilience
1. **Sync Queue Architecture:** In field environments with spotty cellular coverage, attendance and work order logs are secured in an encrypted local queue (`syncQueue.ts`) and synchronized once network connectivity resumes.
2. **Anti-Tampering Timestamps:** Locally cached logs retain device hardware cryptographic timestamps. Altering device clocks to manipulate time records is detected and rejected by the server ingestion pipeline.

---

### 6. Limitation of Software Liability
TechnoSys is provided "as is" for operational workflow enablement. While TechnoCycle maintains 99.9% service uptime via redundant cloud gateways, the Company is not liable for temporary cellular dead zones, carrier network outages, or device-specific hardware camera failures. In the event of system outages, personnel must execute the official Manual Override Protocol via the Field Operations Coordinator.

---

### 7. Inquiries & Modifications
TechnoCycle reserves the right to revise these Terms in response to legal updates or operational expansions. Notice of material changes will be broadcast via the TechnoSys Notification Center, and continued use following notification constitutes acceptance of updated terms.',
    true,
    true
),
(
    'privacy_policy',
    'TechnoCycle Employee & Field Personnel Data Privacy Notice',
    'legal',
    'v1.0.0',
    CURRENT_DATE,
    'all',
    'In compliance with Republic Act No. 10173 (Data Privacy Act of 2012), details the lawful processing of employee personal data, biometric clock-in selfies, and duty-bound GPS tracking solely for employment fulfillment and field coordination.',
    '# TECHNOCYCLE EMPLOYEE DATA PRIVACY & TELEMETRY NOTICE
**Effective Date:** October 17, 2026 | **Version:** 1.0.0  
**Statutory Authority:** Republic Act No. 10173 (Data Privacy Act of 2012) & NPC Circulars  
**Data Controller:** TechnoCycle Corporation, San Pedro, Laguna, Philippines

---

### 1. Statement of Compliance
TechnoCycle Corporation respects your fundamental right to privacy. This Privacy Notice articulates how we process, protect, and retain personal and sensitive personal information collected through the TechnoSys ecosystem, in strict compliance with the **Philippine Data Privacy Act of 2012 (RA 10173)**, its Implementing Rules and Regulations (IRR), and issuances of the **National Privacy Commission (NPC)**.

---

### 2. Lawful Basis for Processing
Processing of employee data in TechnoSys is justified under:
- **Contractual Necessity (Sec. 12[b]):** Processing is required for the execution and fulfillment of the employment contract, payroll processing, and statutory contributions (SSS, PhilHealth, Pag-IBIG).
- **Legitimate Employer Interest (Sec. 12[f]):** Verification of field service delivery at client project sites, asset custody protection, and workforce occupational safety.
- **Legal Obligation (Sec. 12[c]):** Compliance with DOLE labor reporting standards and tax regulations.

---

### 3. Categories of Data Collected
1. **Personal Information:** Full name, mobile telephone number, corporate email address, home address, emergency contacts, designated job role, assigned branch (Pacita HQ or Satellite).
2. **Sensitive Personal Information:** Tax Identification Number (TIN), SSS Number, PhilHealth ID, Pag-IBIG MID, 201 records (NBI clearance, medical certificates, fit-to-work certifications).
3. **Operational Telemetry (Duty-Bound):**
   - **GPS Geographic Coordinates:** Captured during clock-in geofence validation and periodic dispatch tracking.
   - **Verification Selfies:** Front-facing camera images captured solely at the moment of clock-in/out to confirm identity and prevent buddy-punching.
   - **Device & Network Metadata:** Device model, operating system version, and IP address for session security auditing.

---

### 4. Strict Duty-Bound Boundary (No Off-Duty Tracking)
TechnoCycle explicitly guarantees:
- **Zero Off-Duty Surveillance:** Location services are engaged **only** during an open, active dispatch or scheduled work shift.
- **Termination on Punch-Out:** Upon tapping "Clock Out" and confirming the shift summary, background location listeners are terminated. The Company maintains zero visibility into technician location outside paid working hours.
- **No Continuous Video/Audio:** The application does not access microphones or record background video.

---

### 5. Access Control & Confidentiality Boundaries
Access to processed employee records is enforced through cryptographic Row-Level Security (RLS) and strict Role-Based Access Control (RBAC):
- **Field Coordinators:** View only operational dispatch coordinates, schedule statuses, and tool assignments.
- **HR Officers:** Access attendance audit logs, leave requests, 201 compliance files, and disciplinary warnings.
- **Accountants:** Access computed attendance hours (Days Worked, Regular OT, Night Diff) with zero access to GPS tracking histories.
- **CEO / Executive Management:** Global compliance oversight and audit logs.

---

### 6. Retention Schedule & Security Measures
- **Storage:** Data is housed in an isolated Supabase PostgreSQL instance in the AWS Asia Pacific (Singapore) region, encrypted at rest using AES-256 and in transit via TLS 1.3.
- **Retention Period:** Attendance and payroll telemetry are retained for three (3) years in accordance with DOLE statutory inspection requirements, after which records are archived to cold storage or securely purged.
- **Data Subject Rights:** As an employee, you possess the right to be informed, access your records, dispute inaccuracies via the TechnoSys HR Ticketing system, and file grievances with the National Privacy Commission (NPC).

For privacy inquiries, contact the TechnoCycle Data Protection Officer at `dpo@technocycle.com.ph` or the HR Department at Pacita HQ.',
    true,
    true
),
(
    'field_safety_osh',
    'Field Operations, Safety & HVAC Occupational Health Policy',
    'field_ops',
    'v1.0.0',
    CURRENT_DATE,
    'technician',
    'Enforces DOLE Department Order No. 198-18 (Occupational Safety and Health Standards). Mandates the 7-piece PPE standard, specialized HVAC refrigerant handling protocols, and the mandatory two-person crew rule (helpers cannot deploy alone).',
    '# TECHNOCYCLE FIELD OPERATIONS & HVAC OCCUPATIONAL SAFETY POLICY
**Effective Date:** October 17, 2026 | **Version:** 1.0.0  
**Statutory Authority:** Republic Act No. 11058 & DOLE Department Order No. 198-18  
**Applicability:** All Field Technicians, Senior Mechanics, Casual Helpers, and Field Coordinators

---

### 1. Purpose & Commitment
TechnoCycle Corporation holds the occupational health, safety, and physical well-being of its field workforce as paramount. This policy codifies field safety standards for commercial and industrial HVAC/R installation, duct fabrication, maintenance, and system retrofitting, complying strictly with DOLE DO 198-18.

---

### 2. Mandatory 7-Piece Personal Protective Equipment (PPE) Protocol
Before departing Pacita HQ or initiating any job site work, all personnel must be equipped with and actively wear inspected PPE:
1. **Safety Helmet / Hard Hat:** Must be ANSI/ISEA Z89.1 certified, worn at all times on construction, automotive, and industrial premises.
2. **Steel-Toe Safety Shoes:** Mandatory puncture-resistant footwear (min. 200 Joules impact resistance).
3. **Impact Goggles / Face Shield:** Required during brazing, chemical coil cleaning, refrigerant charging, and angle grinding.
4. **Heavy-Duty Protective Gloves:** Heat-resistant gloves for brazing; cut-resistant leather/Kevlar gloves for duct handling; nitrile gloves for coil acids.
5. **Full-Body Safety Harness with Shock-Absorbing Lanyard:** Mandatory for any work performed at an elevation of 1.8 meters (6 feet) or higher. 100% tie-off to certified anchor points required.
6. **High-Visibility Safety Vest:** Required in all automotive service bays, loading docks, and industrial facilities.
7. **Fire Blanket:** Must be deployed beneath any oxy-acetylene torch brazing operation near flammable materials.

Failure to wear required PPE constitutes an immediate safety violation, resulting in dispatch suspension and formal disciplinary recording.

---

### 3. FSM Crew Hierarchy & The "Two-Person Rule"
1. **Lead Technician Responsibility:** Every field dispatch must designate an experienced Lead Technician (Senior Technician or Regular Technician).
2. **Prohibition of Lone Helpers:** Regular Helpers and Casual Helpers are **strictly prohibited** from performing lone-worker field deployments. A helper cannot be dispatched without a Lead Technician on site.
3. **High-Risk Tasks:** Electrical panel troubleshooting (>220V), crane hoisting of condensing units, and confined space duct installations mandate a minimum two-person team at all times.

---

### 4. Specialized HVAC/R Hazardous Material Protocols
1. **Refrigerant Handling (R-22, R-410A, R-32):**
   - Technicians must utilize dedicated recovery machines and recovery cylinders. Venting refrigerants into the atmosphere is strictly prohibited under RA 8749 (Philippine Clean Air Act).
   - R-32 mildly flammable refrigerant systems require pre-operational area sniffer tests and verified ventilation.
2. **Pressurized Nitrogen Pressure Testing:**
   - Nitrogen pressure testing of copper lines must always utilize an inspected, two-stage nitrogen pressure regulator. Direct tank connection without a regulator is a catastrophic violation.
3. **Lockout / Tagout (LOTO):**
   - Technicians must de-energize and padlock circuit breakers before servicing condenser fans, compressors, or air handling unit (AHU) blowers.

---

### 5. Emergency Response & Incident Escalation
1. **Incident Reporting:** Any workplace injury, chemical splash, or equipment flash-burn—no matter how minor—must be reported to the Coordinator and HR via the TechnoSys Support Ticket Kiosk within **two (2) hours**.
2. **Medical Assistance:** Immediate emergency triage must be executed using the vehicle first aid kit, followed by transfer to the nearest accredited clinic or hospital.',
    true,
    true
),
(
    'tool_custody',
    'Equipment, Tool Custody & Inventory Responsibility Policy',
    'inventory',
    'v1.0.0',
    CURRENT_DATE,
    'all',
    'Governs tool check-out, physical return inspections, the 3-day holding aging alert, and DOLE-compliant damage investigations. Mandates that damage liabilities are operational records resolved via formal HR due process—never automatic salary deductions.',
    '# TECHNOCYCLE TOOL CUSTODY & INVENTORY RESPONSIBILITY POLICY
**Effective Date:** October 17, 2026 | **Version:** 1.0.0  
**Statutory Authority:** Articles 113 & 114, Labor Code of the Philippines (PD 442) & Labor Advisory 11-14  
**Applicability:** All Employees handling Company Tools, Machinery, and Assets

---

### 1. Scope & Custody Check-Out Protocol
TechnoCycle Corporation equips its field personnel with specialized, high-grade tools (vacuum pumps, digital manifold gauges, flaring tools, recovery units, rotary hammer drills, and clamp meters) cataloged in `tool_catalog`.
1. **Digital Handover:** Tool custody transfer must be executed digitally through TechnoSys. The recipient technician must inspect the tool and confirm custody in the app.
2. **Visual Condition Assessment:** At check-out, tools are documented under condition `new`, `good`, or `fair`. Pre-existing wear is recorded to protect the borrowing technician.

---

### 2. Physical Care & Safe Transport
1. **Vehicular Security:** Tools must remain securely latched inside service vehicle tool chests when in transit. Leaving tools exposed in open truck beds or unmonitored client areas is prohibited.
2. **Routine Maintenance:** Technicians are responsible for routine cleaning, oil level checks (vacuum pump oil), and proper cable coiling prior to returning items to Pacita HQ.

---

### 3. The 3-Day Holding Rule & Aging Telemetry
1. **Turnover Standard:** Specialized tools checked out for specific service dispatches must be returned to the Pacita HQ inventory locker within **three (3) calendar days** of project completion.
2. **Automated Aging Alert:** Tools held past 72 hours without active dispatch justification trigger an automated amber/red aging flag on the Coordinator Inventory Ledger (`/coordinator/inventory`).
3. **Recall Directive:** The Coordinator may issue an expedited return notice if another team requires the equipment for scheduled industrial work.

---

### 4. Loss, Damage & Fair Due Process (Labor Code Art. 113 Compliance)
Under Article 113 of the Labor Code of the Philippines and Labor Advisory 11-14, **automatic, unauthorized salary deductions for tool damage or loss are strictly illegal**. TechnoCycle enforces strict legal due process:

1. **Incident Filing:** If a tool is damaged or lost on site, the responsible technician must file an Equipment Support Ticket via TechnoSys within 24 hours.
2. **Technical Assessment:** The Field Coordinator and Tool Master inspect the asset to distinguish between **ordinary operational wear and tear** (Company absorbed) versus **gross, willful negligence** (technician accountability).
3. **Formal Notice to Explain (NTE):** If gross negligence is suspected, HR issues a formal Notice to Explain giving the employee five (5) days to submit their written explanation.
4. **Administrative Conference:** A fair hearing is convened with HR, Coordinator, and the employee.
5. **Restitution & Amortization Agreement:** Only upon a formal written finding of liability and **with the voluntary, written signed authorization of the employee**, a fair amortization schedule (spread across multiple pay periods to avoid financial hardship) may be agreed upon.

Attendance logs and damage records remain strictly operational telemetry; the accounting engine performs zero automated deduction math without formal HR authorization.',
    true,
    true
),
(
    'attendance_dtr',
    'Attendance, DTR, Overtime & Leave Administrative Policy',
    'hr_attendance',
    'v1.0.0',
    CURRENT_DATE,
    'all',
    'Defines official shift attendance, geofenced clock-in validation, 15-minute grace period, visual override selfie protocol, advance overtime approvals, and leave filing rules (including mandatory medical certificate for sick leave ≥ 2 consecutive days).',
    '# TECHNOCYCLE ATTENDANCE, DTR, OVERTIME & LEAVE POLICY
**Effective Date:** October 17, 2026 | **Version:** 1.0.0  
**Statutory Authority:** Book Three, Labor Code of the Philippines (PD 442)  
**Applicability:** All Field Personnel, Administrative Staff, and Coordinators

---

### 1. Working Hours, Dispatch Schedules & Core Shifts
1. **Regular Workday:** Standard operating hours consist of eight (8) working hours, exclusive of a one-hour unpaid meal break.
2. **Designated Shift Schedules:** Field dispatch shifts are scheduled and published by the Coordinator via the Dispatch Matrix Board. Technicians must check their upcoming schedule in the Mobile Kiosk at least 12 hours prior.

---

### 2. Geofenced Clock-In & Verification Protocol
1. **Target Site Geofence:** Technicians deployed to client sites (e.g., Toyota Makati, Honda Plant, TS Tech Laguna) must clock in within the programmed geographic radius (typically 100m–300m) of the target coordinates.
2. **Mother Branch Fallback:** Personnel reporting for shop maintenance or duct fabrication clock in within the Pacita HQ geofence.
3. **Visual Override Protocol (Camera Fallback):** If GPS precision is compromised by indoor metal roofing or high-density industrial structures, the technician is automatically routed to the **Visual Override Protocol**. The technician submits a live, timestamped selfie showing the client work area. The attendance log is flagged as `pending_review` and audited by HR without blocking field operations.

---

### 3. Punctuality, Grace Period & Tardiness
1. **15-Minute Operational Grace Period:** To account for Metro Manila and South Luzon Expressway (SLEX) traffic variables, a 15-minute grace period is granted. Clocking in within 15 minutes of shift start is recorded as on-time.
2. **Late Classification:** Arrivals past the 15-minute window are flagged as `Late` with exact minutes recorded in the DTR audit log.
3. **Excessive Tardiness:** Habitual tardiness (more than 3 occurrences in a single cutoff) triggers an HR review and administrative consultation under the Company Code of Conduct.

---

### 4. Overtime (OT) Authorization Standard
1. **Pre-Approval Mandate:** Overtime is voluntary and must be **pre-approved** by the Field Operations Coordinator. Technicians cannot unilaterally extend shifts without authorization.
2. **Emergency Extension:** In scenarios where customer refrigeration would fail if work is halted, the Lead Technician must notify the Coordinator via phone or message before executing OT.
3. **Statutory Compensation:** Approved OT hours are audited by the Accountant and compensated in accordance with the Labor Code (125% regular OT, 130% rest day/holiday OT, and 110% night differential between 10:00 PM and 6:00 AM).

---

### 5. Leave Administration & Sick Leave Medical Certificates
1. **Vacation Leave (VL):** Must be submitted via the Mobile "File Leave" module at least **three (3) working days** in advance for Coordinator review and crew rescheduling.
2. **Emergency Leave (EL):** For sudden family emergencies, notification must be sent to the Coordinator within four (4) hours of shift start.
3. **Sick Leave & Medical Certificate Rule:**
   - Any sick leave spanning **two (2) or more consecutive workdays** mandates the submission of a valid Medical Certificate issued by a licensed physician stating illness diagnosis and fit-to-work clearance.
   - Medical certificates must be attached through the Help Desk Ticketing or submitted directly to HR upon return to work.

---

### 6. Attendance Dispute Resolution
Technicians who observe an inaccurate time log or status badge may tap "Dispute Time Log" directly on the Timesheets modal within **three (3) working days** of cutoff closing. HR audits the raw database timestamps and resolves disputes with transparent written decisions.',
    true,
    true
),
(
    'executive_governance',
    'Executive Governance & Administrative Overrides Protocol',
    'executive',
    'v1.0.0',
    CURRENT_DATE,
    'admin',
    'Establishes executive authority, time-bound CEO system overrides, immutable activity audit logging, and mandatory DOLE compliance justification (≥ 10 characters) for unlocking frozen payroll periods.',
    '# TECHNOCYCLE EXECUTIVE GOVERNANCE & OVERRIDES PROTOCOL
**Effective Date:** October 17, 2026 | **Version:** 1.0.0  
**Statutory Authority:** Corporate By-Laws & DOLE Labor Standards Inspection Regulations  
**Applicability:** Chief Executive Officer (CEO), Super Admins, HR Directors, and System Auditors

---

### 1. Principle of Separation of Powers
TechnoSys enforces strict functional division across role groups:
- **Field Operations (Coordinator):** Schedules, fleet tracking, and tool custody.
- **People & Compliance (HR):** Personnel dossiers, disciplinary actions, ticketing, and leave approvals.
- **Finance (Accountant):** DTR operational hour auditing with zero payroll modification privileges.
- **Executive Oversight (CEO):** Global audits, emergency broadcasts, and exceptional system overrides.

---

### 2. CEO System Overrides Architecture
1. **Emergency Operational Access:** To address operational bottlenecks during coordinator illness or emergency absences, the CEO possesses sole authority to temporarily grant cross-departmental module access.
2. **Time-Bound Expiration:** Overrides are strictly time-bound (`1_day`, `2_days`, `7_days`, or `indefinite`). Expired overrides are automatically revoked by the system engine.
3. **Audit Immutability:** Every override grant, modification, and revocation is recorded in `activity_logs` with the executing administrator ID, timestamp, and target role.

---

### 3. Payroll Cutoff Freeze & Override Justification
1. **Bi-Monthly Finalization:** Attendance records are locked by the Accountant at each bi-monthly cutoff (15th and 30th) to ensure audit fidelity.
2. **The 10-Character Justification Rule:** Unfreezing or modifying a finalized payroll period is restricted exclusively to the CEO and Super Admin. 
3. **Mandatory DOLE Justification:** The unlocking modal enforces a mandatory justification of at least **ten (10) alphanumeric characters** explaining the legal or operational necessity (e.g., "DOLE Compliance dispute settlement ticket #4812"). Blank or generic inputs are rejected by the server action.

---

### 4. Emergency Workforce Broadcasting
1. **Critical Alerts:** The CEO and designated administrators may issue high-priority broadcast announcements via `BroadcasterPage` for typhoon warnings, site shutdowns, or emergency safety stand-downs.
2. **Multi-Channel Delivery:** Broadcasts cascade across in-app notification drawers, high-priority banner modals, and transactional SMS pipelines.

---

### 5. Audit Compliance & Inspection Readiness
All administrative activities, role elevations, document uploads, and disciplinary warnings are retained indefinitely in structured system audit ledgers, ensuring complete audit readiness for DOLE Labor Inspections and external financial reviews.',
    true,
    true
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    version = EXCLUDED.version,
    effective_date = EXCLUDED.effective_date,
    target_audience = EXCLUDED.target_audience,
    summary = EXCLUDED.summary,
    content_markdown = EXCLUDED.content_markdown,
    is_mandatory = EXCLUDED.is_mandatory,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
