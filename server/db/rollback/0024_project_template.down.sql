-- Why: manual schema rollback of 0024_project_template (R14 §3.2, L3); idempotent, dropped child-first.
-- WARNING: destroys every saved template (and its phases/tasks) along with the tables themselves.
-- Templates are typed by hand and nothing else holds them (they do not reference project/task at
-- all, so no other table is affected). Take a backup first (R14 L2) if any template is worth keeping.
-- Order matters: project_template_task and project_template_phase both reference project_template,
-- so they are dropped before it. Dropping a table also drops its indexes, CHECKs and foreign keys.
-- After running this, remove the journal row so db:migrate can re-apply 0024:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1793337555977;
DROP TABLE IF EXISTS "project_template_task";
DROP TABLE IF EXISTS "project_template_phase";
DROP TABLE IF EXISTS "project_template";
