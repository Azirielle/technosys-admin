-- GCash-Style Anti-Spam (Idempotency) for Time Logs
-- This prevents users from spamming the clock-in button and sending duplicate entries.

CREATE OR REPLACE FUNCTION prevent_duplicate_clockins()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if a record exists for this technician within the last 5 minutes
    -- This means they already successfully submitted a time log recently.
    IF EXISTS (
        SELECT 1
        FROM public.time_logs
        WHERE technician_id = NEW.technician_id
          -- We use created_at as the benchmark for when the server received the request
          AND created_at >= (NOW() - INTERVAL '5 minutes')
    ) THEN
        -- A duplicate was found! 
        -- Returning NULL in a BEFORE INSERT trigger tells Postgres to silently 
        -- drop and ignore this insertion without crashing or returning a nasty error to the mobile app.
        -- The mobile app will think it succeeded, preventing errors while we protect the database.
        RETURN NULL;
    END IF;

    -- If no recent duplicate exists, proceed normally and accept the insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists so we can safely re-run this migration
DROP TRIGGER IF EXISTS trg_prevent_duplicate_clockins ON public.time_logs;

-- Attach the "bouncer" trigger to run BEFORE every single insert
CREATE TRIGGER trg_prevent_duplicate_clockins
BEFORE INSERT ON public.time_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_clockins();

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
