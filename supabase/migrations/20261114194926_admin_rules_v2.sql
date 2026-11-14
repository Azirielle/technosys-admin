-- "Admin rules" policy v2.0.0: removes the Accountant role, payroll freezes and other features that don't exist.
-- Wording approved by Andrew on 15 Nov 2026. Done the same way Publish does it in Policies: a new row
-- "<id>_rev_<…>" linked to the old one, and the old one archived (kept for history).
-- (Policies can't publish it: the author can't approve their own draft, there is one HR account,
-- and the CEO can't open the Policies page.)

insert into public.policies (id, title, category, version, effective_date, target_audience, summary, content_markdown,
                             is_mandatory, is_active, status, parent_policy_id, review_notes, published_at,
                             is_material_change, content_hash, created_at, updated_at)
select 'executive_governance_rev_v2', v.title, 'executive', 'v2.0.0', date '2026-11-15', 'admin', v.summary, v.body,
       true, true, 'active', 'executive_governance',
       'New version without the Accountant role and payroll (removed after the proposal defense).',
       now(), true, encode(sha256(convert_to(v.body, 'UTF8')), 'hex'), now(), now()
from (select
  'Admin Rules: Who Does What in TechnoSys'::text as title,
  'Who does what among the CEO, HR and the Coordinator; temporary access; fixing attendance; announcements; and the records the system keeps. No one handles pay in TechnoSys.'::text as summary,
$md$# Admin Rules: Who Does What in TechnoSys
**Effective Date:** November 15, 2026 | **Version:** 2.0.0
**Applies to:** CEO, HR and the Coordinator (Service Dept.)

---

### 1. Who does what
- **Coordinator (Service Dept.):** schedules jobs, assigns crews, watches the live map, and lends and checks in tools.
- **HR:** leave requests, tickets, DTR and attendance corrections, 201 files, warnings and policies.
- **CEO:** sees everything, posts announcements and gives temporary access.
- **No one handles pay in TechnoSys.** The DTR gives hours worked, lates, undertime, overtime and absences; pay is worked out outside the system.

---

### 2. Temporary access
1. When someone is away, only the CEO can let HR or the Coordinator open another module.
2. Access lasts 1 day, 2 days, 7 days or until the CEO removes it. It stops working by itself when it expires.
3. Every grant and removal is recorded in Activity history.

---

### 3. Fixing attendance
1. Only HR (or someone with temporary access) can correct a time-in or time-out.
2. Each correction needs a reason of at least 10 characters.
3. The original punch is kept, along with who changed it and why.

---

### 4. Announcements
The CEO, HR and the Coordinator can post to everyone, field staff or office staff, with an optional push notification.

---

### 5. Records are kept
Corrections, warnings, access grants and other admin actions stay in Activity history, ready for a DOLE inspection.
$md$::text as body) v
on conflict (id) do nothing;

update public.policies
set status = 'archived', is_active = false, archived_at = now(), updated_at = now()
where id = 'executive_governance' and exists (select 1 from public.policies where id = 'executive_governance_rev_v2');
