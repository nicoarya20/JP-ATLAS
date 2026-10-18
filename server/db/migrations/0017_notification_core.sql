-- Why: Inbox cards need the identity of the event they stand for so notify() is idempotent and bulk resolve stays cheap
CREATE TABLE IF NOT EXISTS "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text,
	"project_id" text,
	"lane" text NOT NULL,
	"kind" text NOT NULL,
	"ref_type" text NOT NULL,
	"ref_id" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"bundle_count" integer DEFAULT 1 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolved_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_lane_check" CHECK ("notification"."lane" in ('action', 'info')),
	CONSTRAINT "notification_ref_type_check" CHECK ("notification"."ref_type" in ('task', 'project', 'user', 'event', 'comment')),
	CONSTRAINT "notification_resolved_reason_check" CHECK ("notification"."resolved_reason" in ('acted', 'elsewhere', 'target_closed', 'superseded', 'expired'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_pref" (
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_pref_user_id_category_pk" PRIMARY KEY("user_id","category"),
	CONSTRAINT "notification_pref_category_check" CHECK ("notification_pref"."category" in ('event_reminder', 'news'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notification" ADD CONSTRAINT "notification_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notification_pref" ADD CONSTRAINT "notification_pref_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_recipient_id_dedupe_key_uidx" ON "notification" USING btree ("recipient_id","dedupe_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_recipient_id_action_idx" ON "notification" USING btree ("recipient_id","created_at" DESC NULLS LAST) WHERE "notification"."lane" = 'action' AND "notification"."resolved_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_recipient_id_info_idx" ON "notification" USING btree ("recipient_id","updated_at" DESC NULLS LAST) WHERE "notification"."lane" = 'info';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_ref_idx" ON "notification" USING btree ("ref_type","ref_id") WHERE "notification"."resolved_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_created_at_idx" ON "notification" USING btree ("created_at");