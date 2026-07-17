-- =============================================================
-- MIGRATION: SEED PHILIPPINE HOLIDAYS FOR 2026
-- =============================================================

INSERT INTO public.holidays (name, holiday_date, multiplier, is_active)
VALUES
  ('New Year''s Day', '2026-01-01', 2.00, true),
  ('Chinese New Year', '2026-02-17', 1.30, true),
  ('EDSA People Power Revolution Anniversary', '2026-02-25', 1.30, true),
  ('Maundy Thursday', '2026-04-02', 2.00, true),
  ('Good Friday', '2026-04-03', 2.00, true),
  ('Black Saturday', '2026-04-04', 1.30, true),
  ('Araw ng Kagitingan', '2026-04-09', 2.00, true),
  ('Labor Day', '2026-05-01', 2.00, true),
  ('Independence Day', '2026-06-12', 2.00, true),
  ('Ninoy Aquino Day', '2026-08-21', 1.30, true),
  ('National Heroes Day', '2026-08-31', 2.00, true),
  ('All Saints'' Day', '2026-11-01', 1.30, true),
  ('Bonifacio Day', '2026-11-30', 2.00, true),
  ('Feast of the Immaculate Conception', '2026-12-08', 1.30, true),
  ('Christmas Eve', '2026-12-24', 1.30, true),
  ('Christmas Day', '2026-12-25', 2.00, true),
  ('Rizal Day', '2026-12-30', 2.00, true),
  ('Last Day of the Year', '2026-12-31', 1.30, true)
ON CONFLICT (holiday_date) 
DO UPDATE SET 
  name = EXCLUDED.name,
  multiplier = EXCLUDED.multiplier,
  is_active = EXCLUDED.is_active;

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
