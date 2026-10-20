-- Why: Cuti dengan persetujuan: pengajuan cuti disimpan sebagai rentang tanggal, saklar persetujuan per tim, dan kartu Inbox pengajuan butuh ref_type 'leave'.
-- destructive-ok: DROP CONSTRAINT hanya melonggarkan CHECK notification_ref_type_check; constraint dibuat ulang di migrasi yang sama dengan nilai 'leave' tambahan, tidak ada data yang hilang.
CREATE TABLE IF NOT EXISTS "leave_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"reject_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_request_status_check" CHECK ("leave_request"."status" in ('pending', 'approved', 'rejected', 'canceled')),
	CONSTRAINT "leave_request_end_after_start_check" CHECK ("leave_request"."end_date" >= "leave_request"."start_date")
);
--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "notification_ref_type_check";--> statement-breakpoint
ALTER TABLE "app_setting" ADD COLUMN IF NOT EXISTS "leave_requires_approval" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_request_user_id_status_idx" ON "leave_request" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_request_status_start_date_end_date_idx" ON "leave_request" USING btree ("status","start_date","end_date");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notification" ADD CONSTRAINT "notification_ref_type_check" CHECK ("notification"."ref_type" in ('task', 'project', 'user', 'event', 'comment', 'leave'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;