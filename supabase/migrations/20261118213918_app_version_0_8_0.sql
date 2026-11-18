-- App 0.8.0 (EAS build c9b4da1f, commit 3e90558) is the one the admin's Download App button gives out.
-- The direct .apk from EAS; the build page is https://expo.dev/accounts/technosyss-team/projects/technosys-app/builds/c9b4da1f-ba7f-4e8b-b499-12f2624fa1c3
update public.app_versions set is_active = false where is_active;
insert into public.app_versions (version_name, release_notes, apk_file_url, is_active)
values ('0.8.0', 'Rebuilt app: number + PIN sign-in, Work v2 time-in/out, Techy assistant and tour, tools, leave, DTR, Inbox.',
        'https://expo.dev/artifacts/eas/5dDgz-c4UMXgNrNwb3oXYvSqH9AoxZZ1zcJYkPvyK08.apk', true);
