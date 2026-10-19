-- Why: manual schema rollback of 0019_project_plan (R14 §3.2, L3); idempotent, dropped child-first.
-- WARNING: destroys every phase, milestone, deadline extension and condition override. Phases and milestones are
-- typed by hand and nothing else holds them; the extension history is the only record of why dates moved.
-- Take a backup first (R14 L2). Tasks survive: only their phase link (task.phase_id) is removed.
-- IF EXISTS on the task statements keeps a second run (after 0016 was rolled back too) harmless.
-- Order matters: the task column and its index go first because they point at project_phase, then the
-- milestones, then the phases. Dropping a table also drops its indexes, CHECKs and foreign keys.
-- After running this, remove the journal row so db:migrate can re-apply 0019:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792382206758;
DROP INDEX IF EXISTS "task_phase_id_idx";
ALTER TABLE IF EXISTS "task" DROP CONSTRAINT IF EXISTS "task_phase_id_project_phase_id_fk";
ALTER TABLE IF EXISTS "task" DROP COLUMN IF EXISTS "phase_id";
DROP TABLE IF EXISTS "project_condition_override";
DROP TABLE IF EXISTS "project_deadline_extension";
DROP TABLE IF EXISTS "project_milestone";
DROP TABLE IF EXISTS "project_phase";
