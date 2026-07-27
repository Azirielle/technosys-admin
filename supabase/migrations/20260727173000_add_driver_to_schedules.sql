-- Add driver_id to schedules table to track who the designated driver is for a team dispatch
ALTER TABLE "public"."schedules" ADD COLUMN "driver_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
