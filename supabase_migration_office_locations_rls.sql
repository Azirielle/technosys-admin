-- Migration: Enable Select access for office_locations table
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active office locations" ON office_locations;

CREATE POLICY "Anyone can view active office locations" 
ON office_locations 
FOR SELECT 
USING (is_active = true);
