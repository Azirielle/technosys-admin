-- Drop the legacy inventory tables to prevent schema bloat
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS stock_transactions CASCADE;

-- Create the new Tool Catalog for tracking company assets
CREATE TABLE IF NOT EXISTS tool_catalog (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    image_url text,
    total_stock integer DEFAULT 0,
    available_stock integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Create the new Tool Handovers table to track who holds what
CREATE TABLE IF NOT EXISTS tool_handovers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tool_id uuid REFERENCES tool_catalog(id) ON DELETE CASCADE,
    technician_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    status text CHECK (status IN ('checked_out', 'returned', 'lost', 'damaged')),
    handed_over_at timestamp with time zone DEFAULT now(),
    returned_at timestamp with time zone,
    notes text
);

-- Create RLS Policies (Assuming standard authenticated read/write for now)
ALTER TABLE tool_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY ""Allow authenticated users to read tool_catalog"" 
ON tool_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY ""Allow authenticated users to modify tool_catalog"" 
ON tool_catalog FOR ALL TO authenticated USING (true);

CREATE POLICY ""Allow authenticated users to read tool_handovers"" 
ON tool_handovers FOR SELECT TO authenticated USING (true);
CREATE POLICY ""Allow authenticated users to modify tool_handovers"" 
ON tool_handovers FOR ALL TO authenticated USING (true);

-- Seed Aircon Technician Demo Data
DO $ $
DECLARE
    manifold_id uuid := gen_random_uuid();
    pump_id uuid := gen_random_uuid();
    flaring_id uuid := gen_random_uuid();
    recovery_id uuid := gen_random_uuid();
    multimeter_id uuid := gen_random_uuid();
    
    tech_a uuid;
    tech_b uuid;
BEGIN
    -- Insert Aircon Specific Tools
    INSERT INTO tool_catalog (id, name, description, image_url, total_stock, available_stock) VALUES
    (manifold_id, 'Digital Manifold Gauge', 'Testo 550s Smart Digital Manifold for HVAC/R', 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&q=80&w=200&h=200', 10, 8),
    (pump_id, 'Vacuum Pump 5CFM', 'Robinair 15500 VacuMaster Economy Vacuum Pump', 'https://images.unsplash.com/photo-1590959828853-f725350fa8c8?auto=format&fit=crop&q=80&w=200&h=200', 5, 3),
    (flaring_id, 'Eccentric Cone Flaring Tool', 'Yellow Jacket 60278 Deluxe Flaring Tool', 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&q=80&w=200&h=200', 15, 14),
    (recovery_id, 'Refrigerant Recovery Machine', 'Fieldpiece MR45 Recovery Machine', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=200&h=200', 3, 2),
    (multimeter_id, 'Clamp Multimeter', 'Fluke 323 True-RMS Clamp Meter', 'https://images.unsplash.com/photo-1601004169542-f8fb25de36a4?auto=format&fit=crop&q=80&w=200&h=200', 12, 10);

    -- Grab two random technicians from profiles to assign handovers
    SELECT id INTO tech_a FROM profiles WHERE role = 'technician' LIMIT 1;
    SELECT id INTO tech_b FROM profiles WHERE role = 'technician' AND id != tech_a LIMIT 1;
    
    IF tech_a IS NOT NULL THEN
        -- Active handover
        INSERT INTO tool_handovers (tool_id, technician_id, status, handed_over_at, notes) 
        VALUES (manifold_id, tech_a, 'checked_out', now() - interval '2 days', 'Assigned for Pacita branch installation');
        
        -- Returned handover
        INSERT INTO tool_handovers (tool_id, technician_id, status, handed_over_at, returned_at, notes) 
        VALUES (pump_id, tech_a, 'returned', now() - interval '5 days', now() - interval '1 day', 'Routine maintenance check completed');
    END IF;

    IF tech_b IS NOT NULL THEN
        -- Active handover
        INSERT INTO tool_handovers (tool_id, technician_id, status, handed_over_at, notes) 
        VALUES (pump_id, tech_b, 'checked_out', now() - interval '12 hours', 'Emergency repair at SM Mall');
        
        -- Lost/Damaged handover
        INSERT INTO tool_handovers (tool_id, technician_id, status, handed_over_at, returned_at, notes) 
        VALUES (flaring_id, tech_b, 'damaged', now() - interval '10 days', now() - interval '2 days', 'Cone head broke during pipe expansion');
        
        -- Active handover
        INSERT INTO tool_handovers (tool_id, technician_id, status, handed_over_at, notes) 
        VALUES (recovery_id, tech_b, 'checked_out', now() - interval '3 days', 'Routine freon extraction');
    END IF;
END $ $ ;
