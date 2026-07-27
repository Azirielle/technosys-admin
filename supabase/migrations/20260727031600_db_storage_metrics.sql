-- Migration: db_storage_metrics
-- Description: Adds RPC functions to get table sizes and securely purge old logs

CREATE OR REPLACE FUNCTION get_storage_metrics()
RETURNS TABLE (
    table_name text,
    row_estimate bigint,
    total_bytes bigint,
    index_bytes bigint,
    toast_bytes bigint,
    table_bytes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.relname::text AS table_name,
        c.reltuples::bigint AS row_estimate,
        pg_total_relation_size(c.oid)::bigint AS total_bytes,
        pg_indexes_size(c.oid)::bigint AS index_bytes,
        COALESCE(pg_total_relation_size(c.reltoastrelid), 0)::bigint AS toast_bytes,
        pg_table_size(c.oid)::bigint AS table_bytes
    FROM pg_class c
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relname IN ('time_logs', 'activity_logs', 'push_notifications_queue', 'live_tracking')
    ORDER BY total_bytes DESC;
END;
$$;

CREATE OR REPLACE FUNCTION purge_old_logs(target_table text, max_date timestamptz)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count bigint;
BEGIN
    -- Security check to only allow specific tables
    IF target_table NOT IN ('time_logs', 'activity_logs', 'push_notifications_queue', 'live_tracking') THEN
        RAISE EXCEPTION 'Table not allowed for purging: %', target_table;
    END IF;

    -- Execute dynamic SQL
    EXECUTE format('
        WITH deleted AS (
            DELETE FROM public.%I
            WHERE created_at < %L
            RETURNING 1
        )
        SELECT count(*) FROM deleted;
    ', target_table, max_date) INTO deleted_count;

    RETURN deleted_count;
END;
$$;
