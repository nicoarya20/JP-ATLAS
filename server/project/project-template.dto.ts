/**
 * Frozen wire shapes for project templates (plan §3/§6). Pure: types plus row mappers, no DB import,
 * so the API, the UI and tests share one contract. Field names mirror `project-plan.dto.ts`.
 */
import type { ProjectPriority, ProjectTemplateSource } from '../pm/enums';

export type TemplateTaskDto = {
  id: string;
  title: string;
  description: string | null;
  priority: ProjectPriority | null;
  /** A name matched against task kinds when the template is used; null = "Tugas" at that point. */
  kindName: string | null;
  /** Days from the project's day 0 (its future start date); null = not given. */
  dueOffsetDays: number | null;
};

export type TemplatePhaseDto = {
  id: string;
  name: string;
  description: string | null;
  startOffsetDays: number | null;
  endOffsetDays: number | null;
  tasks: TemplateTaskDto[];
};

/** One template with its phases and tasks (`GET /projects/templates/:id`). */
export type TemplateDetail = {
  id: string;
  name: string;
  description: string | null;
  source: ProjectTemplateSource;
  createdAt: string; // ISO instant
  phases: TemplatePhaseDto[];
  looseTasks: TemplateTaskDto[];
};

/** One row of `GET /projects/templates` (the picker list): counts only, no phase/task detail. */
export type TemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  source: ProjectTemplateSource;
  createdAt: string; // ISO instant
  phaseCount: number;
  taskCount: number;
};

// Row shapes are written out (not `$inferSelect`) so this file never imports the DB schema.
export type TemplateTaskRow = TemplateTaskDto & { templatePhaseId: string | null };
export type TemplatePhaseRow = Omit<TemplatePhaseDto, 'tasks'>;
export type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  source: ProjectTemplateSource;
  createdBy: string | null;
  createdAt: Date;
};

export function toTemplateTaskDto(row: TemplateTaskRow): TemplateTaskDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    kindName: row.kindName,
    dueOffsetDays: row.dueOffsetDays,
  };
}

export function toTemplatePhaseDto(
  row: TemplatePhaseRow,
  tasks: TemplateTaskDto[],
): TemplatePhaseDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startOffsetDays: row.startOffsetDays,
    endOffsetDays: row.endOffsetDays,
    tasks,
  };
}

export function toTemplateDetail(
  row: TemplateRow,
  phases: TemplatePhaseDto[],
  looseTasks: TemplateTaskDto[],
): TemplateDetail {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    phases,
    looseTasks,
  };
}

export function toTemplateListItem(
  row: TemplateRow,
  counts: { phaseCount: number; taskCount: number },
): TemplateListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    phaseCount: counts.phaseCount,
    taskCount: counts.taskCount,
  };
}
