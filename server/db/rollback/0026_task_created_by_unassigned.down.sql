-- Why: manual schema rollback of 0026_task_created_by_unassigned (R14 §3.2, L3); idempotent.
-- Drops only an index; no data is lost. Tugas saya keeps working without it (mineOf then scans the
-- project's live tasks), so roll the code back with it only if the "unassigned belongs to its creator" rule goes too.
-- After running this, remove the journal row so db:migrate can re-apply 0026:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1793686741381;
DROP INDEX IF EXISTS "task_created_by_unassigned_idx";
