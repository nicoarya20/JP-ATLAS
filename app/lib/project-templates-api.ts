/**
 * Client for `/api/app/projects/templates` (Eden): list, detail, delete, "use" (instantiate) and
 * "save a project as a template". Every call is scoped to the signed-in caller's own templates.
 */
import type { ProjectMemberRole, ProjectPriority } from '@server/pm/enums';
import type { ProjectDetail } from '@server/project/project.dto';
import type { TemplateDetail, TemplateListItem } from '@server/project/project-template.dto';
import { client } from './eden';
import { unwrap } from './projects-api';

export type { TemplateDetail, TemplateListItem };
export type TemplatePage = {
  items: TemplateListItem[];
  total: number;
  page: number;
  limit: number;
};

/** Optional overrides when saving a project as a template; both default to the project's own. */
export type SaveFromProjectInput = {
  projectId: string;
  name?: string;
  description?: string | null;
};
/** What a template's size cap left out of a project (zero = nothing). */
export type TemplateOmitted = { phases: number; tasks: number };
export type SavedFromProject = TemplateDetail & { omitted: TemplateOmitted };
export type UseTemplateInput = {
  name?: string;
  startDate: string;
  leadId?: string;
  priority?: ProjectPriority;
  members?: Array<{ userId: string; role: ProjectMemberRole }>;
};

/** React-query keys; invalidate `templateKeys.all` after any write so list and detail agree. */
export const templateKeys = {
  all: ['project-templates'] as const,
  list: (q: string) => ['project-templates', 'list', q] as const,
  detail: (id: string) => ['project-templates', 'detail', id] as const,
};

export async function fetchTemplates(q = ''): Promise<TemplatePage> {
  return unwrap(await client.api.app.projects.templates.get({ query: q ? { q } : {} }));
}

export async function fetchTemplate(id: string): Promise<TemplateDetail> {
  return unwrap(await client.api.app.projects.templates({ id }).get());
}

/** "Simpan sebagai template": copies the structure of a project the caller can see. */
export async function saveProjectAsTemplate(
  input: SaveFromProjectInput,
): Promise<SavedFromProject> {
  return unwrap(await client.api.app.projects.templates['from-project'].post(input));
}

export async function deleteTemplate(id: string): Promise<void> {
  unwrap(await client.api.app.projects.templates({ id }).delete());
}

// Named `applyTemplate`, not `useTemplate`: a name starting with "use" reads as a React hook to
// both humans and lint rules, which this plain async function is not.
export async function applyTemplate(id: string, input: UseTemplateInput): Promise<ProjectDetail> {
  return unwrap(await client.api.app.projects.templates({ id }).use.post(input));
}
