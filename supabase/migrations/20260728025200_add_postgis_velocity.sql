-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography columns to time_logs for accurate distance calculation
ALTER TABLE public.time_logs
ADD COLUMN IF NOT EXISTS clock_in_location geography(Point, 4326),
ADD COLUMN IF NOT EXISTS clock_out_location geography(Point, 4326);

-- Create fraud_audit table to asynchronously flag suspicious punches
CREATE TABLE IF NOT EXISTS public.fraud_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_log_id UUID REFERENCES public.time_logs(id),
    user_id UUID NOT NULL,
    flag_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
