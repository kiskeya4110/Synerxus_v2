CREATE TABLE IF NOT EXISTS "verification_audit_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "activity_id" integer REFERENCES "volunteer_activities"("id"),
  "verified_output_id" integer REFERENCES "verified_outputs"("id"),
  "project_id" integer REFERENCES "projects"("id"),
  "organization_id" integer REFERENCES "organizations"("id"),
  "action" text NOT NULL,
  "previous_status" text,
  "new_status" text,
  "performed_by" integer NOT NULL REFERENCES "users"("id"),
  "performed_by_role" text,
  "volunteer_id" integer REFERENCES "users"("id"),
  "ip_address" text,
  "user_agent" text,
  "device_id" text,
  "geolocation" text,
  "change_details" jsonb,
  "reason" text,
  "evidence_snapshot" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "token" text NOT NULL UNIQUE,
  "activity_id" integer NOT NULL REFERENCES "volunteer_activities"("id"),
  "organization_id" integer REFERENCES "organizations"("id"),
  "action" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_verification_audit_activity" ON "verification_audit_log"("activity_id");
CREATE INDEX IF NOT EXISTS "idx_verification_audit_project" ON "verification_audit_log"("project_id");
CREATE INDEX IF NOT EXISTS "idx_verification_audit_created" ON "verification_audit_log"("created_at");
CREATE INDEX IF NOT EXISTS "idx_verification_tokens_token" ON "verification_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_verification_tokens_activity" ON "verification_tokens"("activity_id");
CREATE INDEX IF NOT EXISTS "idx_verification_tokens_expires" ON "verification_tokens"("expires_at");
