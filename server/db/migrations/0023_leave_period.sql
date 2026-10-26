-- Why: Cuti berubah dari pengajuan+persetujuan menjadi pencatatan status oleh Admin (P14 D2/D3): leave_period menampung rentang cuti yang benar-benar berlaku tanpa kolom status, sementara leave_request dan saklar leave_requires_approval kehilangan pembacanya bersama alur persetujuan (P14 §5).
-- destructive-ok: Urutannya salin-dulu-hapus-terakhir dalam satu berkas: baris 'approved' pindah ke leave_period (created_by diisi decided_by) sebelum DROP TABLE, jadi riwayat cuti yang benar-benar berlaku tidak hilang. Baris 'pending'/'rejected'/'canceled' sengaja tidak ikut — tidak ada keadaan menunggu atau ditolak yang bisa disimpan di model baru. Kolom leave_requires_approval ikut dicabut karena saklarnya hilang bersama persetujuan.
CREATE TABLE IF NOT EXISTS "leave_period" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_period_end_after_start_check" CHECK ("leave_period"."end_date" >= "leave_period"."start_date")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "leave_period" ADD CONSTRAINT "leave_period_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "leave_period" ADD CONSTRAINT "leave_period_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_period_user_id_idx" ON "leave_period" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_period_start_date_end_date_idx" ON "leave_period" USING btree ("start_date","end_date");
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.leave_request') IS NOT NULL THEN
		INSERT INTO "leave_period" ("id", "user_id", "start_date", "end_date", "note", "created_by", "created_at", "updated_at")
		SELECT "id", "user_id", "start_date", "end_date", "note", "decided_by", "created_at", "updated_at"
		FROM "leave_request"
		WHERE "status" = 'approved'
		ON CONFLICT ("id") DO NOTHING;
	END IF;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "leave_request" CASCADE;--> statement-breakpoint
ALTER TABLE "app_setting" DROP COLUMN IF EXISTS "leave_requires_approval";
