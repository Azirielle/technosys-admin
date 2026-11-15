-- Policy wording without payroll or the Accountant role (approved by Andrew, 15 Nov 2026):
-- Attendance/DTR, Privacy notice and Terms of use become v1.1.0. Tool custody keeps its line (it says salary
-- deductions for tool damage are illegal, which protects workers). Saved the way Publish does it: a new row
-- "<id>_rev_v1_1" linked to the old one, and the old one archived. Stops with an error if any line it should
-- replace isn't found, so nothing is saved half-changed.

create temp table policy_edits (policy_id text, old_text text, new_text text) on commit drop;
insert into policy_edits values
  -- every policy: the header
  ('attendance_dtr',   '**Effective Date:** October 16, 2026 | **Version:** 1.0.0', '**Effective Date:** November 15, 2026 | **Version:** 1.1.0'),
  ('privacy_policy',   '**Effective Date:** October 16, 2026 | **Version:** 1.0.0', '**Effective Date:** November 15, 2026 | **Version:** 1.1.0'),
  ('terms_of_service', '**Effective Date:** October 16, 2026 | **Version:** 1.0.0', '**Effective Date:** November 15, 2026 | **Version:** 1.1.0'),
  -- Attendance/DTR §5.3
  ('attendance_dtr',
   '3. **Statutory Compensation:** Approved OT hours are audited by the Accountant and compensated in accordance with the Labor Code (125% regular OT, 130% rest day/holiday OT, and 110% night differential between 10:00 PM and 6:00 AM).',
   '3. **Recording:** Approved OT hours are recorded in the DTR. Pay for overtime follows the Labor Code and is handled outside TechnoSys.'),
  -- Privacy: legal basis, who sees what, retention
  ('privacy_policy',
   'the employment contract, payroll processing, and statutory contributions (SSS, PhilHealth, Pag-IBIG).',
   'the employment contract and statutory contributions (SSS, PhilHealth, Pag-IBIG).'),
  ('privacy_policy',
   '- **Accountants:** Access computed attendance hours (Days Worked, Regular OT, Night Diff) with zero access to GPS tracking histories.',
   '- **CEO:** Sees attendance summaries and activity history for oversight.'),
  ('privacy_policy',
   'Attendance and payroll telemetry are retained for three (3) years',
   'Attendance records are retained for three (3) years'),
  -- Terms: who it covers, and the app names
  ('terms_of_service',
   'Field Technicians, Casual/Regular Helpers, Field Operations Coordinators, HR Officers, Accountants, and Executive Staff',
   'Field Technicians, Helpers, the Coordinator (Service Dept.), HR and the CEO'),
  ('terms_of_service', 'TechnoSys Mobile Application ("Mobile Kiosk")', 'TechnoSys mobile app'),
  ('terms_of_service', 'Next.js Web Administration Portal ("Admin Command Center")', 'TechnoSys admin dashboard');

do $$
declare
  e record;
  body text;
  p text;
begin
  foreach p in array array['attendance_dtr', 'privacy_policy', 'terms_of_service'] loop
    continue when exists (select 1 from public.policies where id = p || '_rev_v1_1');   -- already done
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
    select p || '_rev_v1_1', title, category, 'v1.1.0', date '2026-11-15', target_audience, summary, body,
           is_mandatory, true, 'active', id,
           'New version without payroll or the Accountant role (removed after the proposal defense).',
           now(), false, encode(sha256(convert_to(body, 'UTF8')), 'hex'), now(), now()
    from public.policies where id = p;

    update public.policies set status = 'archived', is_active = false, archived_at = now(), updated_at = now()
    where id = p;
  end loop;
end $$;
