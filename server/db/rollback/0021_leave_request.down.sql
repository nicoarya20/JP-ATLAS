-- Why: manual schema rollback of 0021_leave_request (R14 §3.2, L3); idempotent.
-- WARNING: destroys every leave request (range, note, decision and reject reason) and the "Cuti perlu persetujuan"
-- switch; nothing else holds them. It also deletes the Inbox cards that point at a leave request, because the old
-- notification_ref_type_check cannot hold the 'leave' ref type. Take a backup first (R14 L2).
-- Order matters: the cards go before the CHECK is put back, and the table goes last of its dependants.
-- After running this, remove the journal row so db:migrate can re-apply 0021:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1792484019734;
DELETE FROM "notification" WHERE "ref_type" = 'leave';
ALTER TABLE IF EXISTS "notification" DROP CONSTRAINT IF EXISTS "notification_ref_type_check";
ALTER TABLE IF EXISTS "notification" ADD CONSTRAINT "notification_ref_type_check" CHECK ("notification"."ref_type" in ('task', 'project', 'user', 'event', 'comment'));
ALTER TABLE IF EXISTS "app_setting" DROP COLUMN IF EXISTS "leave_requires_approval";
DROP TABLE IF EXISTS "leave_request";
