CREATE TABLE IF NOT EXISTS public.technician_locations (
    technician_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    status TEXT DEFAULT 'working',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.technician_locations ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to read (so admins can track)
CREATE POLICY "Enable read access for all authenticated users" 
ON public.technician_locations FOR SELECT 
TO authenticated 
USING (true);

-- Allow technicians to insert/update their own location
CREATE POLICY "Enable insert for users based on technician_id" 
ON public.technician_locations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "Enable update for users based on technician_id" 
ON public.technician_locations FOR UPDATE 
TO authenticated 
USING (auth.uid() = technician_id)
WITH CHECK (auth.uid() = technician_id);

-- Enable Supabase Realtime for this table
-- This allows the front-end map to subscribe to live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_locations;

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
