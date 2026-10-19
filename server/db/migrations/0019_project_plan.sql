-- Why: Project plan needs phases, milestones, deadline extensions and manual condition overrides so S5 can show real project condition
CREATE TABLE IF NOT EXISTS "project_condition_override" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"condition" text NOT NULL,
	"reason" text NOT NULL,
	"set_by" text,
	"expires_at" timestamp with time zone,
	"cleared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_condition_override_condition_check" CHECK ("project_condition_override"."condition" in ('on_track', 'at_risk', 'off_track'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_deadline_extension" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"old_due_date" date NOT NULL,
	"new_due_date" date NOT NULL,
	"reason_category" text NOT NULL,
	"reason" text NOT NULL,
	"extended_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_deadline_extension_reason_category_check" CHECK ("project_deadline_extension"."reason_category" in ('scope_change', 'dependency', 'resource', 'other')),
	CONSTRAINT "project_deadline_extension_later_check" CHECK ("project_deadline_extension"."new_due_date" > "project_deadline_extension"."old_due_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_milestone" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"phase_id" text,
	"title" text NOT NULL,
	"description" text,
	"due_date" date NOT NULL,
	"reached_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_phase" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" smallint NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_phase_status_check" CHECK ("project_phase"."status" in ('not_started', 'in_progress', 'done')),
	CONSTRAINT "project_phase_end_after_start_check" CHECK ("project_phase"."end_date" >= "project_phase"."start_date")
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "phase_id" text;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_condition_override" ADD CONSTRAINT "project_condition_override_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_condition_override" ADD CONSTRAINT "project_condition_override_set_by_user_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_deadline_extension" ADD CONSTRAINT "project_deadline_extension_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_deadline_extension" ADD CONSTRAINT "project_deadline_extension_extended_by_user_id_fk" FOREIGN KEY ("extended_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_milestone" ADD CONSTRAINT "project_milestone_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_milestone" ADD CONSTRAINT "project_milestone_phase_id_project_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phase"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_phase" ADD CONSTRAINT "project_phase_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_condition_override_project_id_created_at_idx" ON "project_condition_override" USING btree ("project_id","created_at") WHERE "project_condition_override"."cleared_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_deadline_extension_project_id_created_at_idx" ON "project_deadline_extension" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_milestone_project_id_due_date_idx" ON "project_milestone" USING btree ("project_id","due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_phase_project_id_position_idx" ON "project_phase" USING btree ("project_id","position");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "task" ADD CONSTRAINT "task_phase_id_project_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phase"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_phase_id_idx" ON "task" USING btree ("phase_id") WHERE "task"."phase_id" IS NOT NULL;