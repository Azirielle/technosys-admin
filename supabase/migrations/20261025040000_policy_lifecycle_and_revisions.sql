-- ==============================================================================
-- Migration: 20261025040000_policy_lifecycle_and_revisions.sql
-- Description: Provision 4-stage policy lifecycle columns (status, parent_policy_id, 
--              review_notes, published_at, archived_at, created_by, reviewed_by,
--              is_material_change, content_hash), Single-Draft invariant index,
--              and expanded business categories.
-- ==============================================================================

-- 1. Add Lifecycle & Versioning Columns to company_policies
ALTER TABLE public.company_policies 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
  CHECK (status IN ('draft', 'under_review', 'active', 'archived'));

ALTER TABLE public.company_policies 
  ADD COLUMN IF NOT EXISTS parent_policy_id TEXT REFERENCES public.company_policies(id) ON DELETE SET NULL;

ALTER TABLE public.company_policies 
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_material_change BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 2. Expand category constraint for human-readable business categorization
ALTER TABLE public.company_policies DROP CONSTRAINT IF EXISTS company_policies_category_check;
ALTER TABLE public.company_policies ADD CONSTRAINT company_policies_category_check 
  CHECK (category IN (
    'employment', 
    'compensation', 
    'attendance', 
    'safety', 
    'inventory', 
    'conduct', 
    'legal', 
    'executive', 
    'field_ops', 
    'hr_attendance'
  ));

-- 3. The Single-Draft Invariant: Prevent competing uncoordinated draft branches
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_draft_per_policy 
  ON public.company_policies(parent_policy_id) 
  WHERE status IN ('draft', 'under_review');

-- 4. Ensure all currently seeded active policies have status = 'active'
UPDATE public.company_policies 
SET status = 'active', published_at = COALESCE(published_at, created_at, NOW()) 
WHERE is_active = true AND status IS NULL;
