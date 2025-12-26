CREATE TABLE "invitation_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"name" text NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"template_type" text DEFAULT 'general' NOT NULL,
	"for_role" text,
	"for_department" text,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"title" text,
	"department" text,
	"can_approve_hours" boolean DEFAULT false,
	"can_approve_applications" boolean DEFAULT false,
	"can_manage_projects" boolean DEFAULT false,
	"can_manage_members" boolean DEFAULT false,
	"can_view_reports" boolean DEFAULT true,
	"can_edit_organization" boolean DEFAULT false,
	"status" text DEFAULT 'active',
	"invited_by" integer,
	"invited_at" timestamp,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_member_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"inviter_id" integer NOT NULL,
	"invitee_id" integer,
	"invitee_email" text NOT NULL,
	"invitation_method" text NOT NULL,
	"message_subject" text,
	"message_content" text NOT NULL,
	"custom_message" text,
	"role" text DEFAULT 'member' NOT NULL,
	"title" text,
	"department" text,
	"email_status" text DEFAULT 'pending',
	"email_sent_at" timestamp,
	"email_opened_at" timestamp,
	"email_provider" text,
	"email_message_id" text,
	"dm_status" text DEFAULT 'pending',
	"dm_sent_at" timestamp,
	"dm_read_at" timestamp,
	"dm_message_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp,
	"expires_at" timestamp,
	"reminder_count" integer DEFAULT 0,
	"last_reminder_at" timestamp,
	"invitation_token" text,
	"token_expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "volunteer_organization_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"volunteer_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"first_contact_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"total_applications" integer DEFAULT 1,
	"total_projects_completed" integer DEFAULT 0,
	"total_hours_contributed" integer DEFAULT 0,
	"total_aiu_earned" double precision DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "invitation_templates" ADD CONSTRAINT "invitation_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_templates" ADD CONSTRAINT "invitation_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_dm_message_id_messages_id_fk" FOREIGN KEY ("dm_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_organization_relationships" ADD CONSTRAINT "volunteer_organization_relationships_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_organization_relationships" ADD CONSTRAINT "volunteer_organization_relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_member" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;