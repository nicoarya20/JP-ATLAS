-- Why: manual schema rollback of 0015_project_core (R14 §3.2, L3); idempotent, children dropped before `project`.
-- WARNING: destroys all projects, memberships and project history. Take a backup first (R14 L2).
-- Dropping a table also drops its indexes, CHECKs and foreign keys, so none are listed separately.
-- After running this, remove the journal row so db:migrate can re-apply 0015:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792083891450;
DROP TABLE IF EXISTS "project_activity";
DROP TABLE IF EXISTS "project_member";
DROP TABLE IF EXISTS "project";
