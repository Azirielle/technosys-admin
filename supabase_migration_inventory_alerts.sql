-- ============================================================
-- TechnoSys Phase 12 - Automated Inventory Stock Alerts Trigger
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create trigger function to monitor stock level updates
CREATE OR REPLACE FUNCTION public.handle_low_stock_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Detect if stock level drops below low_stock_threshold
  -- Only trigger if quantity is below/equal threshold AND it was previously above it (transition safeguard)
  IF NEW.quantity <= NEW.low_stock_threshold AND (OLD.quantity IS NULL OR OLD.quantity > NEW.low_stock_threshold) THEN
    -- Insert a system-wide log entry to public.activity_logs
    INSERT INTO public.activity_logs (action_type, target_category, description, created_at)
    VALUES (
      'low_stock_alert',
      'inventory',
      'ALERT: Inventory item "' || NEW.name || '" (SKU: ' || NEW.sku || ') has fallen below the safety limit threshold (' || NEW.low_stock_threshold || ' ' || NEW.unit || '). Current quantity: ' || NEW.quantity || ' ' || NEW.unit || '.',
      timezone('utc'::text, now())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind trigger to inventory_items table
DROP TRIGGER IF EXISTS tr_low_stock ON public.inventory_items;
CREATE TRIGGER tr_low_stock
  AFTER UPDATE OF quantity ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_low_stock_trigger();
