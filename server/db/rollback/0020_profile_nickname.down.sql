-- Why: manual schema rollback of 0020_profile_nickname (R14 §3.2, L3); idempotent.
-- WARNING: destroys every nickname ("Nama panggilan" in Pengaturan > Ubah profil); nothing else holds them.
-- The Beranda greeting then falls back to the first word of the name. Take a backup first (R14 L2).
-- After running this, remove the journal row so db:migrate can re-apply 0020:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792482835394;
ALTER TABLE IF EXISTS "profile" DROP COLUMN IF EXISTS "nickname";
