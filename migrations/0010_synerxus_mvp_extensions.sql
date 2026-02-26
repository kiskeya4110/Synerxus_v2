-- Synerxus MVP Extensions
-- Adds connectivity/consent fields, enriched verification context,
-- professional volunteer fields, CSR subscription fields, and
-- three new tables: value_flip_events, consent_log, outcome_types.

-- ─── organizations ───────────────────────────────────────────────────────────
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "primary_connectivity" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "preferred_verification_method" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "consent_anonymized_benchmarks" boolean DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "consent_timestamp" timestamp;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "consent_version" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "last_verification_at" timestamp;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "verification_rate_30d" double precision;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "silent_days" integer DEFAULT 0;

-- ─── volunteer_profiles ───────────────────────────────────────────────────────
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "phone_country_code" text;
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "current_occupation" text;
ALTER TABLE "volunteer_profiles" ADD COLUMN IF NOT EXISTS "industry" text;

-- ─── csr_partners ─────────────────────────────────────────────────────────────
ALTER TABLE "csr_partners" ADD COLUMN IF NOT EXISTS "program_name" text;
ALTER TABLE "csr_partners" ADD COLUMN IF NOT EXISTS "program_type" text;
ALTER TABLE "csr_partners" ADD COLUMN IF NOT EXISTS "esg_frameworks" text[];
ALTER TABLE "csr_partners" ADD COLUMN IF NOT EXISTS "fiscal_year_end" text;
ALTER TABLE "csr_partners" ADD COLUMN IF NOT EXISTS "b_corp_certified" boolean DEFAULT false;
ALTER TABLE "csr_partners" ADD COLUMN IF NOT EXISTS "subscription_tier" text DEFAULT 'free';
ALTER TABLE "csr_partners" ADD COLUMN IF NOT EXISTS "subscription_start_date" timestamp;
ALTER TABLE "csr_partners" ADD COLUMN IF NOT EXISTS "subscription_end_date" timestamp;

-- ─── volunteer_activities ─────────────────────────────────────────────────────
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "beneficiary_count" integer;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "beneficiary_type" text;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "sdg_mapping_method" text DEFAULT 'manual';
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "verifier_phone" text;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "verifier_name" text;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "verifier_role" text;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "device_type" text;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "geo_latitude" double precision;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "geo_longitude" double precision;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "geo_accuracy_meters" double precision;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "hours_since_submission" double precision;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "local_time_of_day" text;
ALTER TABLE "volunteer_activities" ADD COLUMN IF NOT EXISTS "day_of_week" text;

-- ─── value_flip_events ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "value_flip_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "volunteer_id" integer NOT NULL REFERENCES "users"("id"),
  "organization_id" integer REFERENCES "organizations"("id"),
  "project_id" integer REFERENCES "projects"("id"),
  "event_type" text NOT NULL,
  "event_date" timestamp NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ─── consent_log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "consent_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer REFERENCES "users"("id"),
  "organization_id" integer REFERENCES "organizations"("id"),
  "consent_type" text NOT NULL,
  "consent_version" text NOT NULL,
  "consent_given" boolean NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ─── outcome_types ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "outcome_types" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer REFERENCES "organizations"("id"),
  "name" text NOT NULL,
  "description" text,
  "unit" text,
  "category" text,
  "sdg_goal" integer,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_value_flip_volunteer" ON "value_flip_events"("volunteer_id");
CREATE INDEX IF NOT EXISTS "idx_value_flip_org" ON "value_flip_events"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_value_flip_event_date" ON "value_flip_events"("event_date");
CREATE INDEX IF NOT EXISTS "idx_consent_log_user" ON "consent_log"("user_id");
CREATE INDEX IF NOT EXISTS "idx_consent_log_org" ON "consent_log"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_outcome_types_org" ON "outcome_types"("organization_id");
