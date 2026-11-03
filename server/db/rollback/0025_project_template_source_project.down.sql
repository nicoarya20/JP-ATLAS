-- Why: manual schema rollback of 0025_project_template_source_project (R14 §3.2, L3); idempotent.
-- WARNING: templates saved from a project (source = 'project') are relabelled 'manual' so the old
-- CHECK (story, manual) can hold again; their phases and tasks are kept, only the origin label is lost.
-- After running this, remove the journal row so db:migrate can re-apply 0025:
--   DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1793637714284;
UPDATE "project_template" SET "source" = 'manual' WHERE "source" = 'project';
ALTER TABLE "project_template" DROP CONSTRAINT IF EXISTS "project_template_source_check";
DO $$ BEGIN
	ALTER TABLE "project_template" ADD CONSTRAINT "project_template_source_check" CHECK ("project_template"."source" in ('story', 'manual'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
