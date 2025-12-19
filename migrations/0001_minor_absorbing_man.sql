CREATE TABLE "claude_bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"conversation_id" integer NOT NULL,
	"message_id" integer,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claude_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"session_id" text NOT NULL,
	"title" text,
	"summary" text,
	"status" text DEFAULT 'active' NOT NULL,
	"message_count" integer DEFAULT 0,
	"tokens_used" integer DEFAULT 0,
	"model" text,
	"project_context" text,
	"tags" text[],
	"metadata" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "claude_conversations_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "claude_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"message_index" integer NOT NULL,
	"tokens_used" integer,
	"tools_used" text[],
	"files_modified" text[],
	"files_read" text[],
	"commands_executed" text[],
	"error_occurred" boolean DEFAULT false,
	"error_message" text,
	"duration" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"volunteer_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"photos" text[],
	"project_id" integer,
	"organization_id" integer,
	"sdg_goals" integer[],
	"location" text,
	"impact_highlight" text,
	"is_published" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"likes_count" integer DEFAULT 0,
	"views_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "milestones" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "completion_hours_weight" integer DEFAULT 60;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "completion_milestones_weight" integer DEFAULT 40;--> statement-breakpoint
ALTER TABLE "claude_bookmarks" ADD CONSTRAINT "claude_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_bookmarks" ADD CONSTRAINT "claude_bookmarks_conversation_id_claude_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."claude_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_bookmarks" ADD CONSTRAINT "claude_bookmarks_message_id_claude_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."claude_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_conversations" ADD CONSTRAINT "claude_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claude_messages" ADD CONSTRAINT "claude_messages_conversation_id_claude_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."claude_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_story_id_volunteer_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."volunteer_stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_stories" ADD CONSTRAINT "volunteer_stories_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_stories" ADD CONSTRAINT "volunteer_stories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_stories" ADD CONSTRAINT "volunteer_stories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;