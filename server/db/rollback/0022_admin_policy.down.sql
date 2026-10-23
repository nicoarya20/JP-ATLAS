-- Why: manual schema rollback of 0022_admin_policy (R14 §3.2, L3); idempotent.
-- WARNING: destroys the Admin-owned announcement banner, the sign-in policy (approval switch, default
-- sign-up role, invitation lifetime) and the organisation notification defaults; nothing else holds them.
-- No account, invitation or notification row is touched: every column here is a setting, and dropping it
-- only puts the hard-coded defaults back (approval required, member, 14 days, both categories on, 30 min).
-- Take a backup first (R14 L2).
-- After running this, remove the journal row so db:migrate can re-apply 0022:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792743123560;
ALTER TABLE IF EXISTS "app_setting" DROP COLUMN IF EXISTS "notification_defaults";
ALTER TABLE IF EXISTS "app_setting" DROP COLUMN IF EXISTS "invitation_ttl_days";
ALTER TABLE IF EXISTS "app_setting" DROP COLUMN IF EXISTS "default_signup_role";
ALTER TABLE IF EXISTS "app_setting" DROP COLUMN IF EXISTS "signup_requires_approval";
ALTER TABLE IF EXISTS "app_setting" DROP COLUMN IF EXISTS "announcement";
