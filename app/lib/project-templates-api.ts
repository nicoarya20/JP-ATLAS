/**
 * Client for `/api/app/projects/templates` (Eden, plan §6): list, detail, CRUD and "use"
 * (instantiate). Every call is scoped to the signed-in caller's own templates by the server.
 */
import type { ProjectMemberRole, ProjectPriority, ProjectTemplateSource } from '@server/pm/enums';
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

export type TemplateTaskInput = {
  title: string;
  description?: string | null;
  priority?: ProjectPriority | null;
  kindName?: string | null;
  dueOffsetDays?: number | null;
};
export type TemplatePhaseInput = {
  name: string;
  description?: string | null;
  startOffsetDays?: number | null;
  endOffsetDays?: number | null;
  tasks?: TemplateTaskInput[];
};
/** Body of create and replace-all update. */
export type SaveTemplateInput = {
  name: string;
  description?: string | null;
  source: ProjectTemplateSource;
  phases?: TemplatePhaseInput[];
  looseTasks?: TemplateTaskInput[];
};
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

export async function createTemplate(input: SaveTemplateInput): Promise<TemplateDetail> {
  return unwrap(await client.api.app.projects.templates.post(input));
}

export async function updateTemplate(
  id: string,
  input: SaveTemplateInput,
): Promise<TemplateDetail> {
  return unwrap(await client.api.app.projects.templates({ id }).patch(input));
}

export async function deleteTemplate(id: string): Promise<void> {
  unwrap(await client.api.app.projects.templates({ id }).delete());
}

// Named `applyTemplate`, not `useTemplate`: a name starting with "use" reads as a React hook to
// both humans and lint rules, which this plain async function is not.
export async function applyTemplate(id: string, input: UseTemplateInput): Promise<ProjectDetail> {
  return unwrap(await client.api.app.projects.templates({ id }).use.post(input));
}
