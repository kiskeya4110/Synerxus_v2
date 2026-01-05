CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation_code_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"email" text,
	"user_type" text,
	"organization_id" integer,
	"max_uses" integer DEFAULT 1,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"description" text,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivery_status" text DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "approval_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "approval_notes" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "data_consent" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "data_consent_date" timestamp;--> statement-breakpoint
ALTER TABLE "invitation_code_usage" ADD CONSTRAINT "invitation_code_usage_code_id_invitation_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."invitation_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_code_usage" ADD CONSTRAINT "invitation_code_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_codes" ADD CONSTRAINT "invitation_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_codes" ADD CONSTRAINT "invitation_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;