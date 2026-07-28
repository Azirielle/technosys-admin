-- Add is_driver boolean capability flag to profiles
ALTER TABLE "public"."profiles" ADD COLUMN "is_driver" boolean DEFAULT false;
