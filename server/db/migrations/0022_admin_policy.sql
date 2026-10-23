-- Why: Admin perlu mengatur pengumuman, kebijakan akses masuk, dan bawaan pemberitahuan dari layar Pengaturan; sebelumnya nilainya hidup di konstanta kode (P13 RD-01)
ALTER TABLE "app_setting" ADD COLUMN IF NOT EXISTS "announcement" jsonb;--> statement-breakpoint
ALTER TABLE "app_setting" ADD COLUMN IF NOT EXISTS "signup_requires_approval" boolean;--> statement-breakpoint
ALTER TABLE "app_setting" ADD COLUMN IF NOT EXISTS "default_signup_role" text;--> statement-breakpoint
ALTER TABLE "app_setting" ADD COLUMN IF NOT EXISTS "invitation_ttl_days" integer;--> statement-breakpoint
ALTER TABLE "app_setting" ADD COLUMN IF NOT EXISTS "notification_defaults" jsonb;