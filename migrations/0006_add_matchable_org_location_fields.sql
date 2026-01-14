-- Add city and country columns to matchable_organizations table
ALTER TABLE "matchable_organizations" ADD COLUMN IF NOT EXISTS "city" text;
--> statement-breakpoint
ALTER TABLE "matchable_organizations" ADD COLUMN IF NOT EXISTS "country" text;
