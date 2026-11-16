-- Work phones (16 Nov 2026, asked by Andrew after testing in Expo Go):
--   * The app's phone id now comes from the phone itself (Android ID / iOS vendor id, sent only as a
--     SHA-256 hash), so "Clear data" or reinstalling no longer makes the same phone look new.
--     Old ids ("phone-<random>") can never match again, so those registrations and requests are
--     removed; the person registers again in first-time setup. (Only Ramon Santos's demo phone had one.)
--   * Phone details are confidential: only the person, HR and the CEO can read them (before, the
--     Coordinator could too). HR sees every registered phone on the new Work phones page.
--   * New Terms of use and Privacy notice (v1.2.0) that explain the registered work phone, so
--     everyone agrees to it again in the app's first-time setup.

-- 1. Old random ids
delete from public.device_change_requests where device_id like 'phone-%';
delete from public.registered_devices where device_id like 'phone-%';

-- 2. Who can read phone details
drop policy "own phone or office" on public.registered_devices;
create policy "own phone or hr" on public.registered_devices
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.my_role()) in ('hr', 'ceo'));

drop policy "own requests or office" on public.device_change_requests;
create policy "own requests or hr" on public.device_change_requests
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.my_role()) in ('hr', 'ceo'));

-- 3. Terms of use and Privacy notice v1.2.0 (same method as 20261114200204_policies_without_payroll)
create temp table policy_edits (policy_id text, old_text text, new_text text) on commit drop;
insert into policy_edits values
('privacy_policy_rev_v1_1',
 '**Effective Date:** November 15, 2026 | **Version:** 1.1.0',
 '**Effective Date:** November 16, 2026 | **Version:** 1.2.0'),
('privacy_policy_rev_v1_1',
 '   - **Device & Network Metadata:** Device model, operating system version, and IP address for session security auditing.',
 $t$   - **Device & Network Metadata:** Device model, operating system version, and IP address for session security auditing.
   - **Registered Work Phone:** The brand and model of the one phone you chose as your work phone (e.g. "Samsung SM-A155F"), when it was registered and last used, and a one-way scrambled code made from the ID your phone gives the TechnoSys app. The code cannot be turned back into that ID and cannot be used to read your phone number, contacts, photos, messages or files. It is used only to check that time-ins come from your own registered phone, so nobody can time in for someone else.$t$),
('privacy_policy_rev_v1_1',
 '- **CEO / Executive Management:** Global compliance oversight and audit logs.',
 $t$- **CEO / Executive Management:** Global compliance oversight and audit logs.

**Registered work phone details are confidential.** Only you, HR and the CEO can see which phone is registered to you. The Coordinator and other employees cannot. HR uses these details only to approve a switch to a new phone or to reset your phone, never to track, contact or identify you outside work. They are deleted when HR resets your phone or when your account is removed.$t$),
('terms_of_service_rev_v1_1',
 '**Effective Date:** November 15, 2026 | **Version:** 1.1.0',
 '**Effective Date:** November 16, 2026 | **Version:** 1.2.0'),
('terms_of_service_rev_v1_1',
 '4. **Credential Confidentiality:** Users are responsible for safeguarding their login credentials. Permitting unauthorized third parties to access an administrative or field session is strictly prohibited.',
 $t$4. **Credential Confidentiality:** Users are responsible for safeguarding their login credentials. Permitting unauthorized third parties to access an administrative or field session is strictly prohibited.
5. **One Registered Work Phone:** Each technician and helper uses the TechnoSys mobile app on one registered phone, chosen in the app's first-time setup. Signing in and timing in from any other phone is refused. Lending your phone or PIN so that someone else can time in for you counts as falsifying your Daily Time Record (Section 2.3).
6. **Changing Phones:** If you get a new phone, sign in on it and tap "Ask HR to use this phone". Your old phone keeps working until HR approves the new one; after that, only the new phone works. Clearing the app's data or reinstalling the app on the same phone does not change your registered phone. A factory reset may: then ask HR the same way.
7. **Confidentiality of Phone Details:** Details of your registered phone are handled as described in the Privacy Notice (Section 5): only you, HR and the CEO can see them, and they are used only for the one-phone rule.$t$);

do $$
declare
  e record;
  body text;
  p text;
  new_id text;
begin
  foreach p in array array['privacy_policy_rev_v1_1', 'terms_of_service_rev_v1_1'] loop
    new_id := replace(p, '_rev_v1_1', '_rev_v1_2');
    continue when exists (select 1 from public.policies where id = new_id);   -- already done
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
    select new_id, title, category, 'v1.2.0', date '2026-11-16', target_audience, summary, body,
           is_mandatory, true, 'active', id,
           'New version that explains the one registered work phone and keeps its details confidential.',
           now(), true, encode(sha256(convert_to(body, 'UTF8')), 'hex'), now(), now()
    from public.policies where id = p;

    update public.policies set status = 'archived', is_active = false, archived_at = now(), updated_at = now()
    where id = p;
  end loop;
end $$;
