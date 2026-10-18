-- Why: manual schema rollback of 0018_event_core (R14 §3.2, L3); idempotent, dropped child-first.
-- WARNING: destroys every event, its participants, its minutes and its reminder claims. Minutes are typed by
-- hand and exist nowhere else, so they cannot be regenerated. Take a backup first (R14 L2).
-- Order matters only for readability: every child FK is ON DELETE CASCADE, but dropping the children first
-- keeps this script correct even if a later migration weakens one of them.
-- Dropping a table also drops its indexes, CHECKs and foreign keys, so none are listed separately.
-- After running this, remove the journal row so db:migrate can re-apply 0018:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792271441571;
DROP TABLE IF EXISTS "event_reminder";
DROP TABLE IF EXISTS "event_note";
DROP TABLE IF EXISTS "event_participant";
DROP TABLE IF EXISTS "event";
