-- Why: Tabel baru buat proyek dari cerita AI dan template: project_template/_phase/_task menampung blueprint yang bisa dipakai ulang, privat per pembuat (lihat docs/plans/project-create-story-template.md).
CREATE TABLE IF NOT EXISTS "project_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_template_source_check" CHECK ("project_template"."source" in ('story', 'manual'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_template_phase" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" smallint NOT NULL,
	"start_offset_days" integer,
	"end_offset_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_template_phase_end_after_start_check" CHECK ("project_template_phase"."end_offset_days" >= "project_template_phase"."start_offset_days")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_template_task" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"template_phase_id" text,
	"title" text NOT NULL,
	"description" text,
	"priority" text,
	"kind_name" text,
	"due_offset_days" integer,
	"position" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_template_task_priority_check" CHECK ("project_template_task"."priority" in ('low', 'medium', 'high', 'critical'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_template" ADD CONSTRAINT "project_template_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_template_phase" ADD CONSTRAINT "project_template_phase_template_id_project_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."project_template"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_template_task" ADD CONSTRAINT "project_template_task_template_id_project_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."project_template"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_template_task" ADD CONSTRAINT "project_template_task_template_phase_id_project_template_phase_id_fk" FOREIGN KEY ("template_phase_id") REFERENCES "public"."project_template_phase"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_template_created_by_idx" ON "project_template" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_template_phase_template_id_position_idx" ON "project_template_phase" USING btree ("template_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_template_task_template_id_position_idx" ON "project_template_task" USING btree ("template_id","position");