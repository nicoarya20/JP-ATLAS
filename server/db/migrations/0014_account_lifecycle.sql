-- Why: akun lama harus tetap bisa masuk saat persetujuan akun diwajibkan (KEPUTUSAN §2 Q2/Q4, X1 D6):
-- role `user` -> `member`, semua akun yang ada -> approved, akun demo anonim -> rejected, akun baru -> pending.
-- no-down: backfill role dan status tidak dapat dibalik
-- Hand-edited from the drizzle-kit output: the generated ADD COLUMN used DEFAULT 'pending', which would
-- have locked every existing account. Order matters: the column is added with DEFAULT 'approved' (so the
-- backfill is implicit), the demo accounts are rejected, and only then is the default flipped to 'pending'.
UPDATE "user" SET "role" = 'member' WHERE "role" IS NULL OR "role" = 'user';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approval_decided_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approval_decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approval_reason" text;--> statement-breakpoint
UPDATE "user" SET "approval_status" = 'rejected', "approval_reason" = 'Demo dimatikan', "approval_decided_at" = now()
	WHERE "is_anonymous" IS TRUE AND "approval_status" = 'approved' AND "approval_decided_at" IS NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "approval_status" SET DEFAULT 'pending';--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user" ADD CONSTRAINT "user_approval_status_check" CHECK ("approval_status" IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user" ADD CONSTRAINT "user_approval_decided_by_user_id_fk" FOREIGN KEY ("approval_decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_approval_status_idx" ON "user" USING btree ("approval_status") WHERE "approval_status" <> 'approved';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"phone" text,
	"job_title" text,
	"department" text,
	"text_size" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "profile_text_size_check" CHECK ("text_size" IN ('normal','besar','sangat_besar'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
INSERT INTO "profile" ("id", "user_id") SELECT gen_random_uuid()::text, u."id" FROM "user" u
	WHERE u."is_anonymous" IS NOT TRUE ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"invited_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_user_id" text,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitation_email_normalized_check" CHECK ("email" = lower(btrim("email"))),
	CONSTRAINT "user_invitation_role_check" CHECK ("role" IN ('member','project_manager','admin'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_accepted_user_id_user_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_invitation_active_email_uq" ON "user_invitation" USING btree ("email") WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
