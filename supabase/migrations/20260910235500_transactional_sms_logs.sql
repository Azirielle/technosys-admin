-- Migration: 20260910235500_transactional_sms_logs.sql
-- Transactional SMS delivery logs for notification cascade telemetry

CREATE TABLE IF NOT EXISTS public.transactional_sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  cascade_reason TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'semaphore' | 'twilio' | 'mock'
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'mock_sent' | 'failed'
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying by recipient, category, and date
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON public.transactional_sms_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_category ON public.transactional_sms_logs(category);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.transactional_sms_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.transactional_sms_logs ENABLE ROW LEVEL SECURITY;

-- Admins, HR, Accountants, and Service Dept can view SMS logs
CREATE POLICY "Admins and HR can view transactional SMS logs"
ON public.transactional_sms_logs
FOR SELECT
TO authenticated
USING (
  (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (
    ARRAY['super_admin'::user_role, 'ceo'::user_role, 'coo'::user_role, 'admin'::user_role, 'hr'::user_role, 'accountant'::user_role, 'coordinator'::user_role]
  )
);

-- Service role has full access (for Edge Functions and Server Actions)
CREATE POLICY "Service role full access to transactional_sms_logs"
ON public.transactional_sms_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
