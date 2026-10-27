-- Why: manual schema rollback of 0023_leave_period (R14 §3.2, L3); idempotent.
-- WARNING: this cannot undo 0023 faithfully, because 0023 is the one migration that throws data away on
-- purpose. It rebuilds the empty `leave_request` table and the "Cuti perlu persetujuan" switch, and copies
-- every leave period back as an `approved` request (`decided_by` from `created_by`, `decided_at` from
-- `created_at`), but the requests that were `pending`, `rejected` or `canceled` before 0023 ran are gone for
-- good — 0023 never copied them. It then destroys every leave period, including the ones Admin recorded
-- after 0023. Take a backup first (R14 L2); restoring one is the only faithful way back.
-- Order matters: the table and the column come back before the rows are copied, and leave_period goes last.
-- NOT REVERSED: the sweep added on 26 Okt 2026 (last statement of 0023) closed the leftover
-- leave_requested/leave_decided Inbox rows and moved them to the news lane. It is one-way, because
-- emit.leave.ts used to close the very same kind with the very same reason ('elsewhere'), so a swept
-- row cannot be told apart from one the app had already closed. Un-resolving by reason would reopen
-- both. Those rows read as plain news either way, and retention deletes them after NOTIF_RETENTION_DAYS.
-- After running this, remove the journal row so db:migrate can re-apply 0023:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792975942619;
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
DO $$ BEGIN
	ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
	ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "leave_request_user_id_status_idx" ON "leave_request" USING btree ("user_id","status");
CREATE INDEX IF NOT EXISTS "leave_request_status_start_date_end_date_idx" ON "leave_request" USING btree ("status","start_date","end_date");
ALTER TABLE "app_setting" ADD COLUMN IF NOT EXISTS "leave_requires_approval" boolean DEFAULT true NOT NULL;
DO $$ BEGIN
	IF to_regclass('public.leave_period') IS NOT NULL THEN
		INSERT INTO "leave_request" ("id", "user_id", "start_date", "end_date", "note", "status", "decided_by", "decided_at", "created_at", "updated_at")
		SELECT "id", "user_id", "start_date", "end_date", "note", 'approved', "created_by", "created_at", "created_at", "updated_at"
		FROM "leave_period"
		ON CONFLICT ("id") DO NOTHING;
	END IF;
END $$;
DROP TABLE IF EXISTS "leave_period" CASCADE;
