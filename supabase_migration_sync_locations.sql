-- =============================================================
-- MIGRATION: BACKGROUND LOCATION SYNC TO LIVE TRACKING
-- =============================================================

-- 1. Create or replace trigger function to sync coordinates
CREATE OR REPLACE FUNCTION public.sync_technician_locations()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.technician_locations (technician_id, latitude, longitude, status, updated_at)
    VALUES (NEW.technician_id, NEW.latitude, NEW.longitude, 'working', NEW.recorded_at)
    ON CONFLICT (technician_id)
    DO UPDATE SET 
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind trigger to live_locations table
DROP TRIGGER IF EXISTS trigger_sync_technician_locations ON public.live_locations;
CREATE TRIGGER trigger_sync_technician_locations
AFTER INSERT ON public.live_locations
FOR EACH ROW
EXECUTE FUNCTION public.sync_technician_locations();

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
