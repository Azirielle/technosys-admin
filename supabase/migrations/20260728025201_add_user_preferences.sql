-- Add JSONB column for UI state like onboarding tutorials
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}'::jsonb;
