-- ============================================================
-- TechnoSys Phase 9 Allowances Migration:
-- Add allowance_rate to schedules and allowances to payslips.
-- ============================================================

-- 1. Add allowance_rate to schedules (defaults to 0.0)
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS allowance_rate NUMERIC NOT NULL DEFAULT 0.0;

-- 2. Add allowances to payslips (defaults to 0.0)
ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS allowances NUMERIC NOT NULL DEFAULT 0.0;
