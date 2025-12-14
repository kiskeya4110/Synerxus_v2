CREATE TABLE "aiu_export_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"exported_by" integer NOT NULL,
	"export_type" text NOT NULL,
	"project_ids" integer[],
	"volunteer_ids" integer[],
	"reporting_period" text,
	"record_count" integer,
	"export_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"volunteer_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cover_letter" text,
	"resume_url" text,
	"match_score" integer,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text,
	"category" text NOT NULL,
	"tier" text DEFAULT 'bronze',
	"condition" text NOT NULL,
	"threshold_type" text,
	"threshold_value" integer,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beneficiary_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"beneficiary_identifier" text NOT NULL,
	"first_served_date" timestamp NOT NULL,
	"last_served_date" timestamp,
	"total_sessions_attended" integer DEFAULT 1,
	"demographic_category" text,
	"verification_source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project_id" integer,
	"event_type" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" text,
	"attendees" integer[],
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"volunteer_id" integer NOT NULL,
	"topic" text NOT NULL,
	"project_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csr_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sdg_goal" integer NOT NULL,
	"target_hours" integer,
	"target_participants" integer,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"reward_type" text,
	"reward_value" text,
	"current_hours" integer DEFAULT 0,
	"current_participants" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csr_commitment_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"year" integer NOT NULL,
	"target_employee_percent" integer,
	"target_total_hours" integer,
	"target_sdgs" integer[],
	"target_beneficiaries" integer,
	"actual_employee_percent" integer DEFAULT 0,
	"actual_hours" integer DEFAULT 0,
	"actual_beneficiaries" integer DEFAULT 0,
	"completion_percent" integer DEFAULT 0,
	"status" text DEFAULT 'in-progress',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csr_partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_name" text NOT NULL,
	"logo_url" text,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"industry_type" text,
	"employee_count" integer,
	"annual_csr_budget" double precision,
	"primary_sdgs" integer[],
	"roster_sync_status" text DEFAULT 'pending',
	"last_roster_sync_date" timestamp,
	"vto_tracking_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csr_project_portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer,
	"name" text NOT NULL,
	"description" text,
	"tier" text NOT NULL,
	"status" text NOT NULL,
	"primary_sdg" integer,
	"secondary_sdgs" integer[],
	"start_date" timestamp,
	"end_date" timestamp,
	"budget_allocated" integer,
	"budget_spent" integer DEFAULT 0,
	"budget_variance" integer,
	"project_lead" text,
	"team_members" jsonb,
	"partners" jsonb,
	"theory_of_change" text,
	"baseline_metrics" jsonb,
	"target_metrics" jsonb,
	"current_metrics" jsonb,
	"leading_indicators" jsonb,
	"trailing_indicators" jsonb,
	"beneficiaries_direct" integer,
	"beneficiaries_indirect" integer,
	"milestones" jsonb,
	"deliverables" jsonb,
	"risk_assessment" jsonb,
	"stakeholder_satisfaction" integer,
	"completion_percentage" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"commitment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"checkin_type" text,
	"hours_logged" integer NOT NULL,
	"tasks_completed" text[],
	"skills_applied" text[],
	"location_coordinates" text,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_commitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"organization_id" integer,
	"project_id" integer,
	"status" text DEFAULT 'interested' NOT NULL,
	"hours_committed" integer,
	"hours_completed" integer DEFAULT 0,
	"skills_applied" text[],
	"impact_observed" text,
	"reflection_notes" text,
	"certificate_issued" boolean DEFAULT false,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_engagement" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"employee_email" text NOT NULL,
	"employee_name" text,
	"project_id" integer,
	"hours_volunteered" integer DEFAULT 0,
	"engagement_type" text,
	"impact_score" integer DEFAULT 0,
	"completion_status" text DEFAULT 'in-progress',
	"certificate_issued" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"milestone_type" text NOT NULL,
	"milestone_value" text,
	"badge_image" text,
	"earned_date" timestamp NOT NULL,
	"visibility" text DEFAULT 'organization',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"application_id" integer,
	"assignment_id" integer,
	"rating" integer NOT NULL,
	"fit_question" text,
	"fit_response" text,
	"additional_comments" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" text,
	"category" text,
	"sdg_goal" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_type" text NOT NULL,
	"organization_id" integer,
	"total_hours" integer DEFAULT 0,
	"tasks_completed" integer DEFAULT 0,
	"projects_completed" integer DEFAULT 0,
	"impacts_logged" integer DEFAULT 0,
	"weekly_streak" integer DEFAULT 0,
	"max_streak" integer DEFAULT 0,
	"total_points" integer DEFAULT 0,
	"badges_earned" integer DEFAULT 0,
	"last_activity_date" timestamp,
	"rank" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "match_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"volunteer_id" integer NOT NULL,
	"opportunity_id" integer NOT NULL,
	"match_score" integer NOT NULL,
	"confidence" integer,
	"data_completeness" integer,
	"match_category" text,
	"skill_match_score" integer,
	"sdg_match_score" integer,
	"location_match_score" integer,
	"availability_match_score" integer,
	"interest_match_score" integer,
	"experience_match_score" integer,
	"engagement_boost" integer,
	"outcome" text,
	"application_accepted" boolean,
	"project_completed" boolean,
	"volunteer_feedback" integer,
	"organization_feedback" integer,
	"weights_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matchable_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"profile_photo_url" text,
	"logo" text,
	"mission" text NOT NULL,
	"needs" text[] NOT NULL,
	"sdg_focus" integer[] NOT NULL,
	"location" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "matchable_organizations_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"volunteer_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"score" double precision NOT NULL,
	"matched_on" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matching_weights" (
	"id" serial PRIMARY KEY NOT NULL,
	"skill_weight" double precision DEFAULT 0.4,
	"availability_weight" double precision DEFAULT 0.3,
	"sdg_weight" double precision DEFAULT 0.2,
	"location_weight" double precision DEFAULT 0.1,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"thread_id" integer,
	"subject" text,
	"content" text NOT NULL,
	"project_id" integer,
	"message_type" text DEFAULT 'general' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_user_id" integer,
	"related_entity_type" text,
	"related_entity_id" integer,
	"sdg_goals" integer[],
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"organization_id" integer NOT NULL,
	"project_id" integer,
	"required_skills" text[],
	"optional_skills" text[],
	"location" text,
	"is_remote" boolean DEFAULT false,
	"engagement_type" text,
	"time_commitment" text,
	"commitment_type" text,
	"ongoing_hours_per_week" integer,
	"project_total_hours" integer,
	"event_date" timestamp,
	"event_start_time" text,
	"event_end_time" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"volunteers_needed" integer DEFAULT 1,
	"volunteer_roles" jsonb,
	"total_volunteer_contribution" integer DEFAULT 100,
	"status" text DEFAULT 'open' NOT NULL,
	"category" text,
	"sdg_goals" integer[],
	"primary_sdg" integer,
	"impact_metric_name" text,
	"impact_metric_unit" text,
	"benefits" text,
	"requirements" text,
	"is_urgent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"logo_url" text,
	"mission_statement" text,
	"focus_areas" text[],
	"organization_type" text,
	"organization_legal_name" text,
	"common_name" text,
	"size" text,
	"year_founded" integer,
	"tax_id" text,
	"registration_number" text,
	"registration_status" text,
	"primary_sdgs" integer[],
	"geographic_scope" text,
	"geographic_location" text,
	"languages" text[],
	"target_beneficiaries" text,
	"volunteer_needs" text[],
	"required_skills" text[],
	"preferred_volunteer_type" text,
	"minimum_commitment" text,
	"language_requirements" text,
	"tech_requirements" text,
	"reporting_preference" text,
	"reporting_frequency" text,
	"willing_to_share_data" boolean DEFAULT false,
	"willing_for_impact_verification" boolean DEFAULT false,
	"cobranded" boolean DEFAULT false,
	"diaspora_engagement" boolean DEFAULT false,
	"preferred_communication" text[],
	"timezone" text,
	"best_time_to_connect" text,
	"impact_stats" jsonb,
	"social_media" jsonb,
	"website_url" text,
	"verification_status" text DEFAULT 'pending',
	"email_digest_enabled" boolean DEFAULT true,
	"onboarding_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_profiles_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"website" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"primary_sdgs" integer[],
	"needs" text[],
	"goals" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_aiu_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"sdg_indicator" text NOT NULL,
	"kpi_name" text NOT NULL,
	"kpi_unit" text NOT NULL,
	"kpi_before" double precision NOT NULL,
	"kpi_after" double precision,
	"kpi_measurement_date" timestamp,
	"attribution_factor" double precision DEFAULT 0.2 NOT NULL,
	"attribution_methodology" text,
	"reporting_window_start" timestamp,
	"reporting_window_end" timestamp,
	"verification_status" text DEFAULT 'pending',
	"verifier_id" integer,
	"verifier_organization" text,
	"verified_at" timestamp,
	"evidence_links" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"volunteer_id" integer NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"completed_at" timestamp,
	"hours_committed" integer,
	"hours_completed" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_budget_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"budget_line_item" text,
	"allocated_budget" double precision,
	"estimated_roi" double precision,
	"actual_roi" double precision,
	"volunteer_hours_value" double precision,
	"attributed_to" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_impacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"task_id" integer,
	"metric_id" integer,
	"user_id" integer,
	"value" integer NOT NULL,
	"date" timestamp NOT NULL,
	"notes" text,
	"evidence_urls" text[],
	"outcome_type" text DEFAULT 'individual',
	"role" text DEFAULT 'support',
	"verification_status" text DEFAULT 'pending',
	"dedup_group_id" integer,
	"is_duplicated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"organization_id" integer,
	"status" text NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"location" text,
	"goals" jsonb,
	"sdg_goals" integer[],
	"cover_image" text,
	"completion_percentage" integer DEFAULT 0,
	"ai_tracking_enabled" boolean DEFAULT false,
	"completion_preferences" jsonb,
	"required_skills" text[],
	"optional_skills" text[],
	"experience_level" text,
	"engagement_type" text,
	"commitment_type" text,
	"ongoing_hours_per_week" integer,
	"project_total_hours" integer,
	"total_hours_logged" integer DEFAULT 0,
	"primary_sdg" integer,
	"impact_metric_name" text,
	"impact_metric_unit" text,
	"lives_touched" integer DEFAULT 0,
	"volunteers_needed" integer DEFAULT 1,
	"volunteer_roles" jsonb,
	"total_volunteer_contribution" integer DEFAULT 100,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rejected_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"volunteer_id" integer NOT NULL,
	"rejected_at" timestamp DEFAULT now() NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"volunteer_id" integer NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project_id" integer,
	"assignee_id" integer,
	"status" text NOT NULL,
	"priority" text,
	"due_date" timestamp,
	"estimated_hours" integer,
	"required_skills_override" text[],
	"sdg_goals_override" integer[],
	"is_remote_override" boolean,
	"location_override" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"organization_id" integer,
	"csr_partner_id" integer,
	"image_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"is_optimized" boolean DEFAULT false,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"progress_percentage" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_data_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" integer,
	"previous_data" jsonb,
	"new_data" jsonb,
	"discrepancy_type" text,
	"discrepancy_details" text,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"user_type" text,
	"display_name" text,
	"avatar" text,
	"bio" text,
	"skills" text[],
	"availability" jsonb,
	"credentials" jsonb,
	"organization_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verified_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_id" integer,
	"partner_id" integer,
	"project_id" integer NOT NULL,
	"output_type" text NOT NULL,
	"output_value" integer NOT NULL,
	"verification_status" text DEFAULT 'pending',
	"verified_by" integer,
	"verified_at" timestamp,
	"evidence" jsonb,
	"audit_trail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"project_id" integer,
	"task_id" integer,
	"hours" integer NOT NULL,
	"date" timestamp NOT NULL,
	"description" text,
	"skills_applied" text[],
	"outcomes" text,
	"outcome_type" text DEFAULT 'individual',
	"role" text DEFAULT 'support',
	"verification_status" text DEFAULT 'pending',
	"evidence_urls" text[],
	"dedup_group_id" integer,
	"is_duplicated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_aiu_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"volunteer_id" integer NOT NULL,
	"aiu_settings_id" integer,
	"reporting_period" text,
	"role" text DEFAULT 'support' NOT NULL,
	"hours_contributed" double precision NOT NULL,
	"sessions_count" integer DEFAULT 0,
	"lives_impacted" integer DEFAULT 0,
	"unique_beneficiaries_served" integer DEFAULT 0,
	"role_weight" double precision DEFAULT 1 NOT NULL,
	"reliability_multiplier" double precision DEFAULT 0.7 NOT NULL,
	"volunteer_weight" double precision,
	"weight_percentage" double precision,
	"aiu_unique" double precision,
	"aiu_sessions" double precision,
	"total_aiu" double precision,
	"verification_status" text DEFAULT 'self_reported',
	"verifier_id" integer,
	"verified_at" timestamp,
	"evidence_links" text[],
	"calculated_at" timestamp,
	"formula_version" text DEFAULT '1.0.0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_employer_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"volunteer_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"employee_id" text,
	"department" text,
	"job_title" text,
	"verification_status" text DEFAULT 'pending',
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"volunteer_name" text,
	"professional_title" text,
	"years_of_experience" text,
	"linkedin_profile" text,
	"location" text,
	"city" text,
	"country" text,
	"languages" text[],
	"skills" text[],
	"skill_ratings" jsonb,
	"interests" text[],
	"experience" jsonb,
	"education" jsonb,
	"category" text,
	"preferred_causes" text[],
	"weekly_availability" integer,
	"availability" jsonb,
	"timezone" text,
	"preferred_commitment" text,
	"preferred_work_style" text,
	"preferred_sdgs" integer[],
	"matching_priorities" jsonb,
	"personal_statement" text,
	"motivations" text,
	"achievements" text[],
	"phone_number" text,
	"emergency_contact" jsonb,
	"resume_url" text,
	"profile_photo_url" text,
	"overall_rating" double precision DEFAULT 0,
	"email_digest_enabled" boolean DEFAULT true,
	"onboarding_completed" boolean DEFAULT false,
	"employer_id" integer,
	"department_name" text,
	"job_title_at_company" text,
	"experience_level" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "volunteer_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "volunteer_spotlights" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"week_start_date" timestamp NOT NULL,
	"story" text NOT NULL,
	"impact" text,
	"photo_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"profile_photo_url" text,
	"skills" text[] NOT NULL,
	"interests" text[] NOT NULL,
	"location" text NOT NULL,
	"sdg_goals" integer[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "volunteers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "aiu_export_logs" ADD CONSTRAINT "aiu_export_logs_exported_by_users_id_fk" FOREIGN KEY ("exported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_registry" ADD CONSTRAINT "beneficiary_registry_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_threads" ADD CONSTRAINT "conversation_threads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csr_challenges" ADD CONSTRAINT "csr_challenges_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csr_commitment_goals" ADD CONSTRAINT "csr_commitment_goals_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csr_partners" ADD CONSTRAINT "csr_partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csr_project_portfolios" ADD CONSTRAINT "csr_project_portfolios_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_activity_logs" ADD CONSTRAINT "employee_activity_logs_commitment_id_employee_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."employee_commitments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_activity_logs" ADD CONSTRAINT "employee_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_activity_logs" ADD CONSTRAINT "employee_activity_logs_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_commitments" ADD CONSTRAINT "employee_commitments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_commitments" ADD CONSTRAINT "employee_commitments_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_commitments" ADD CONSTRAINT "employee_commitments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_commitments" ADD CONSTRAINT "employee_commitments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_engagement" ADD CONSTRAINT "employee_engagement_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_engagement" ADD CONSTRAINT "employee_engagement_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_milestones" ADD CONSTRAINT "employee_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_milestones" ADD CONSTRAINT "employee_milestones_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_assignment_id_project_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."project_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_stats" ADD CONSTRAINT "leaderboard_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_stats" ADD CONSTRAINT "leaderboard_stats_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_analytics" ADD CONSTRAINT "match_analytics_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_analytics" ADD CONSTRAINT "match_analytics_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_organization_id_matchable_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."matchable_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matching_weights" ADD CONSTRAINT "matching_weights_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_conversation_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."conversation_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_aiu_settings" ADD CONSTRAINT "project_aiu_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_aiu_settings" ADD CONSTRAINT "project_aiu_settings_verifier_id_users_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_budget_links" ADD CONSTRAINT "project_budget_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_budget_links" ADD CONSTRAINT "project_budget_links_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_impacts" ADD CONSTRAINT "project_impacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_impacts" ADD CONSTRAINT "project_impacts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_impacts" ADD CONSTRAINT "project_impacts_metric_id_impact_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."impact_metrics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_impacts" ADD CONSTRAINT "project_impacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_opportunities" ADD CONSTRAINT "rejected_opportunities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_opportunities" ADD CONSTRAINT "rejected_opportunities_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_images" ADD CONSTRAINT "uploaded_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_images" ADD CONSTRAINT "uploaded_images_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_images" ADD CONSTRAINT "uploaded_images_csr_partner_id_csr_partners_id_fk" FOREIGN KEY ("csr_partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_data_audit_logs" ADD CONSTRAINT "user_data_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_data_audit_logs" ADD CONSTRAINT "user_data_audit_logs_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_outputs" ADD CONSTRAINT "verified_outputs_activity_id_volunteer_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."volunteer_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_outputs" ADD CONSTRAINT "verified_outputs_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_outputs" ADD CONSTRAINT "verified_outputs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verified_outputs" ADD CONSTRAINT "verified_outputs_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_activities" ADD CONSTRAINT "volunteer_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_activities" ADD CONSTRAINT "volunteer_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_activities" ADD CONSTRAINT "volunteer_activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_aiu_records" ADD CONSTRAINT "volunteer_aiu_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_aiu_records" ADD CONSTRAINT "volunteer_aiu_records_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_aiu_records" ADD CONSTRAINT "volunteer_aiu_records_aiu_settings_id_project_aiu_settings_id_fk" FOREIGN KEY ("aiu_settings_id") REFERENCES "public"."project_aiu_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_aiu_records" ADD CONSTRAINT "volunteer_aiu_records_verifier_id_users_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_employer_links" ADD CONSTRAINT "volunteer_employer_links_volunteer_id_volunteer_profiles_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteer_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_employer_links" ADD CONSTRAINT "volunteer_employer_links_partner_id_csr_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_employer_id_csr_partners_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."csr_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_spotlights" ADD CONSTRAINT "volunteer_spotlights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_volunteer_org_match" ON "matches" USING btree ("volunteer_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_badge" ON "user_badges" USING btree ("user_id","badge_id");