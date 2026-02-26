-- Fix: Add columns that were defined in Drizzle schema but missing from the database.
-- These missing columns caused getDashboardDataForVolunteer to throw a 500 error,
-- making the volunteer dashboard show 0 for all metrics (hours, verified count, etc.).

ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "sector_expertise" text[];
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "sector_requirements" text[];
