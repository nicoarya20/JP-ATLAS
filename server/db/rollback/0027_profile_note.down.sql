-- Why: manual schema rollback of 0027_profile_note (R14 §3.2, L3); idempotent.
-- WARNING: destroys every status note (the bubble beside the photo on the mobile profile); nothing else holds them.
-- The mobile profile then shows "+ Add a note" for everyone. Take a backup first (R14 L2).
-- After running this, remove the journal row so db:migrate can re-apply 0027:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1793687110543;
ALTER TABLE IF EXISTS "profile" DROP COLUMN IF EXISTS "note";
