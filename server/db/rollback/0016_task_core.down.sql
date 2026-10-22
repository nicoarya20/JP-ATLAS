-- Why: manual schema rollback of 0016_task_core (R14 §3.2, L3); idempotent, children dropped before parents.
-- WARNING: destroys all task kinds, tasks, checklists, comments and task history. Take a backup first (R14 L2).
-- Dropping a table also drops its indexes, CHECKs, foreign keys and (for `task`) the owned identity sequence
-- task_number_seq, so none are listed separately. Order matters: the three detail tables reference `task`,
-- and `task` references `task_kind`.
-- After running this, remove the journal row so db:migrate can re-apply 0016:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792089040954;
DROP TABLE IF EXISTS "task_activity";
DROP TABLE IF EXISTS "task_comment";
DROP TABLE IF EXISTS "task_checklist_item";
DROP TABLE IF EXISTS "task";
DROP TABLE IF EXISTS "task_kind";
