-- Why: Template kini dibuat dari proyek yang sudah ada, jadi nilai source 'project' harus lolos check constraint.
-- destructive-ok: DROP hanya melepas check constraint lama untuk dipasang ulang dengan nilai tambahan; tidak ada data hilang.
ALTER TABLE "project_template" DROP CONSTRAINT IF EXISTS "project_template_source_check";--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "project_template" ADD CONSTRAINT "project_template_source_check" CHECK ("project_template"."source" in ('story', 'manual', 'project'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;