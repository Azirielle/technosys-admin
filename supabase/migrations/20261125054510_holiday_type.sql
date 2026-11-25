-- Regular vs special holidays (client interview, Nov 2026: "dalawa ang klase ng holiday natin"; CONSULTATION_FIXES B7).
-- The DTR shows Sunday, regular-holiday and special-holiday hours apart. Hours only, no pay rates (payroll is out of scope).
-- The 10 regular holidays by law; everything else in the list is special. HR can change a day's type.
alter table public.holidays add column holiday_type text not null default 'special' check (holiday_type in ('regular', 'special'));
update public.holidays set holiday_type = 'regular' where name in (
  'New Year''s Day', 'Maundy Thursday', 'Good Friday', 'Araw ng Kagitingan', 'Labor Day', 'Independence Day',
  'National Heroes Day', 'Bonifacio Day', 'Christmas Day', 'Rizal Day');
