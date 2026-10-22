-- Why: Menu Event needs its own tables so meetings, participants, minutes and reminder claims live outside the task tree
CREATE TABLE IF NOT EXISTS "event" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"title" text NOT NULL,
	"kind" text DEFAULT 'meeting' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location_type" text,
	"location_text" text,
	"meeting_url" text,
	"agenda" text,
	"reminders_minutes" integer[] DEFAULT '{1440,30}' NOT NULL,
	"canceled_at" timestamp with time zone,
	"cancel_reason" text,
	"canceled_by" text,
	"created_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"deleted_with_project_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_kind_check" CHECK ("event"."kind" in ('meeting', 'review', 'important', 'team', 'other')),
	CONSTRAINT "event_location_type_check" CHECK ("event"."location_type" in ('offline', 'online')),
	CONSTRAINT "event_ends_after_starts_check" CHECK ("event"."ends_at" > "event"."starts_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_note" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"written_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_note_status_check" CHECK ("event_note"."status" in ('draft', 'confirmed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_participant" (
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"added_by" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_participant_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_reminder" (
	"event_id" text NOT NULL,
	"offset_minutes" integer NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_reminder_event_id_offset_minutes_pk" PRIMARY KEY("event_id","offset_minutes")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event" ADD CONSTRAINT "event_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event" ADD CONSTRAINT "event_canceled_by_user_id_fk" FOREIGN KEY ("canceled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event" ADD CONSTRAINT "event_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event" ADD CONSTRAINT "event_deleted_with_project_id_project_id_fk" FOREIGN KEY ("deleted_with_project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event_note" ADD CONSTRAINT "event_note_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event_note" ADD CONSTRAINT "event_note_written_by_user_id_fk" FOREIGN KEY ("written_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event_participant" ADD CONSTRAINT "event_participant_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event_participant" ADD CONSTRAINT "event_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event_participant" ADD CONSTRAINT "event_participant_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "event_reminder" ADD CONSTRAINT "event_reminder_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_starts_at_idx" ON "event" USING btree ("starts_at") WHERE "event"."deleted_at" IS NULL AND "event"."canceled_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_project_id_starts_at_idx" ON "event" USING btree ("project_id","starts_at") WHERE "event"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_created_by_idx" ON "event" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_deleted_at_idx" ON "event" USING btree ("deleted_at") WHERE "event"."deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_deleted_with_project_id_idx" ON "event" USING btree ("deleted_with_project_id") WHERE "event"."deleted_with_project_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_note_event_id_uidx" ON "event_note" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_participant_user_id_event_id_idx" ON "event_participant" USING btree ("user_id","event_id");