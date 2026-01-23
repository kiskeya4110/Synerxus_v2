-- Add verification audit trail fields to volunteer_activities table
-- These fields enable tracking who verified/rejected logs and when

-- Change hours from integer to double precision for 0.5 hour increments
ALTER TABLE "volunteer_activities" ALTER COLUMN "hours" TYPE double precision;
--> statement-breakpoint

-- Add outcome quantity for verified impact tracking
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "outcome_quantity" integer;
--> statement-breakpoint

-- Add verification audit trail fields
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "verified_by" integer REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;
--> statement-breakpoint
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "rejected_reason" text;
--> statement-breakpoint

-- Add outcome templates to projects for defining what outcomes can be logged
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "outcome_templates" jsonb;
