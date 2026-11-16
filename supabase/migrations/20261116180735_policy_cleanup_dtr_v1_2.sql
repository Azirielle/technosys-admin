-- Policy clean-up (17 Nov 2026, Andrew's decisions):
--   1. Delete the old draft "Industrial HVAC Emergency Response & Refrigerant Leak Plan" (v0.9.0-draft,
--      under review since 24 Oct, two short paragraphs, never signed). Field safety is covered by the active
--      "Field Operations, Safety & HVAC Occupational Health Policy".
--   2. Attendance, DTR, Overtime & Leave policy v1.2.0: matches what the app really does. No pay wording,
--      no "Mobile Kiosk", no old screen names; HR decides leaves; certificates are private; one work phone.

delete from public.policies where id = 'hvac_emergency_action_plan_draft' and status <> 'active';

create temp table policy_edits (policy_id text, old_text text, new_text text) on commit drop;
insert into policy_edits values
('attendance_dtr_rev_v1_1',
 '**Effective Date:** November 15, 2026 | **Version:** 1.1.0',
 '**Effective Date:** November 17, 2026 | **Version:** 1.2.0'),
('attendance_dtr_rev_v1_1',
 'exclusive of a one-hour unpaid meal break.',
 'plus a one-hour meal break.'),
('attendance_dtr_rev_v1_1',
 'Field dispatch shifts are scheduled and published by the Coordinator via the Dispatch Matrix Board. Technicians must check their upcoming schedule in the Mobile Kiosk at least 12 hours prior.',
 'Jobs are scheduled by the Coordinator on the admin dashboard. Technicians and helpers check their upcoming jobs in the TechnoSys app (Jobs tab) at least 12 hours before.'),
('attendance_dtr_rev_v1_1',
 $t$3. **Visual Override Protocol (Camera Fallback):** If GPS precision is compromised by indoor metal roofing or high-density industrial structures, the technician is automatically routed to the Visual Override Protocol. The technician submits a live, timestamped selfie showing the client work area. The attendance log is flagged as pending_review and audited by HR without blocking field operations.$t$,
 $t$3. **Selfie when outside the site:** If the app finds you outside the job's circle (for example when metal roofs weaken the GPS), it asks for a live selfie showing the work area. The time-in is saved as "outside the work site" and HR checks it, without stopping your work. Selfies are private: only you and the office can see them.
4. **One registered work phone:** Time in and out only on the phone registered to you in the app's first-time setup. Time-ins from any other phone are refused (Terms of Use, Section 2).$t$),
('attendance_dtr_rev_v1_1',
 $t$2. **Satellite Drift Gating:** The mobile application automatically compares device system time against GPS satellite ephemeris. Discrepancies exceeding five (5) minutes trigger an automated clock-in block (timeTamperingDetected).$t$,
 $t$2. **Wrong phone clock:** The app compares the phone's clock with the GPS time. If they differ by more than five (5) minutes, time-in is blocked until the phone uses automatic time, and a time-out is marked for HR to check.$t$),
('attendance_dtr_rev_v1_1',
 '3. **Recording:** Approved OT hours are recorded in the DTR. Pay for overtime follows the Labor Code and is handled outside TechnoSys.',
 '3. **Recording:** Approved OT hours are recorded in the DTR.'),
('attendance_dtr_rev_v1_1',
 $t$1. **Vacation Leave (VL):** Must be submitted via the Mobile "File Leave" module at least three (3) working days in advance for Coordinator review and crew rescheduling.
2. **Emergency Leave (EL):** For sudden family emergencies, notification must be sent to the Coordinator within four (4) hours of shift start.$t$,
 $t$1. **Vacation Leave (VL):** File it in the app (Profile → Leave → File a leave) at least three (3) working days in advance. HR approves or declines it, and the Coordinator reschedules the crew.
2. **Emergency Leave (EL):** For sudden family emergencies, file it in the app and tell the Coordinator within four (4) hours of shift start.$t$),
('attendance_dtr_rev_v1_1',
 'stating illness diagnosis and fit-to-work clearance.',
 $t$stating illness diagnosis and fit-to-work clearance. Attach a photo of it when you file the leave in the app. Certificates are private: only you, HR and the CEO can open them.$t$),
('attendance_dtr_rev_v1_1',
 $t$Technicians who observe an inaccurate time log or status badge may tap "Dispute Time Log" directly on the Timesheets modal within three (3) working days of cutoff closing. HR audits the raw database timestamps and resolves disputes with transparent written decisions.$t$,
 $t$If a day in your DTR looks wrong, open it in the app (DTR tab → the day → "Ask HR about this day") within three (3) working days after the cut-off closes. HR checks the recorded times and answers in writing. Every correction HR makes is kept with its reason and shows on that day.$t$);

do $$
declare
  e record;
  body text;
  p constant text := 'attendance_dtr_rev_v1_1';
  new_id constant text := 'attendance_dtr_rev_v1_2';
begin
  if exists (select 1 from public.policies where id = new_id) then return; end if;   -- already done
  select content_markdown into body from public.policies where id = p and is_active;
  if body is null then raise exception 'No active % to revise', p; end if;

  for e in select * from policy_edits where policy_id = p loop
    if position(e.old_text in body) = 0 then
      raise exception 'Line not found in %: %', p, left(e.old_text, 80);
    end if;
    body := replace(body, e.old_text, e.new_text);
  end loop;

  insert into public.policies (id, title, category, version, effective_date, target_audience, summary, content_markdown,
                               is_mandatory, is_active, status, parent_policy_id, review_notes, published_at,
                               is_material_change, content_hash, created_at, updated_at)
  select new_id, title, category, 'v1.2.0', date '2026-11-17', target_audience, summary, body,
         is_mandatory, true, 'active', id,
         'New version that matches the app: no pay wording, HR decides leaves, private certificates, one work phone, current screen names.',
         now(), true, encode(sha256(convert_to(body, 'UTF8')), 'hex'), now(), now()
  from public.policies where id = p;

  update public.policies set status = 'archived', is_active = false, archived_at = now(), updated_at = now()
  where id = p;
end $$;
