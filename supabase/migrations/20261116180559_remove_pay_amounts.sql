-- No pay amounts (17 Nov 2026, Andrew's decision; payroll was removed by the panel).
--   casual_helpers.daily_rate: a temporary worker's daily pay in pesos. Not needed for scheduling.
--   holidays.multiplier: the holiday pay rate (e.g. 2.0). DTR only needs to know the day is a holiday.
alter table public.casual_helpers drop column if exists daily_rate;
alter table public.holidays drop column if exists multiplier;
