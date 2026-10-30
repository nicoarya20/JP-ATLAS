/**
 * Read side of project templates (plan §5.1, §6): the owner's own list (with phase/task counts) and
 * one template's full detail (phases with their tasks, in display order). Every read is scoped to
 * `created_by = principal.id` — a template is private, so there is no "all templates" view at all.
 */
import { and, asc, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { canUseTemplate } from '../access/project-template.policy';
import type { Principal } from '../access/types';
import { db } from '../db';
import { projectTemplate, projectTemplatePhase, projectTemplateTask } from '../db/schema';
import type { TemplateDetail, TemplateListItem, TemplateTaskDto } from './project-template.dto';
import {
  toTemplateDetail,
  toTemplateListItem,
  toTemplatePhaseDto,
  toTemplateTaskDto,
} from './project-template.dto';

export type ListTemplatesInput = { q?: string; limit: number; offset: number };
export type TemplatePage = { items: TemplateListItem[]; total: number };

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

/** The caller's own templates, most recently created first, optionally filtered by name — never anyone else's. */
export async function listTemplates(
  p: Principal,
  input: ListTemplatesInput,
): Promise<TemplatePage> {
  const where = and(
    eq(projectTemplate.createdBy, p.id),
    input.q ? ilike(projectTemplate.name, likePattern(input.q)) : undefined,
  );
  const rows = await db
    .select()
    .from(projectTemplate)
    .where(where)
    .orderBy(desc(projectTemplate.createdAt))
    .limit(input.limit)
    .offset(input.offset);
  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(projectTemplate)
    .where(where);
  if (rows.length === 0) return { items: [], total };

  const ids = rows.map((r) => r.id);
  const counts = await db
    .select({
      templateId: projectTemplateTask.templateId,
      taskCount: sql<number>`count(*)::int`,
    })
    .from(projectTemplateTask)
    .where(inArray(projectTemplateTask.templateId, ids))
    .groupBy(projectTemplateTask.templateId);
  const phaseCounts = await db
    .select({
      templateId: projectTemplatePhase.templateId,
      phaseCount: sql<number>`count(*)::int`,
    })
    .from(projectTemplatePhase)
    .where(inArray(projectTemplatePhase.templateId, ids))
    .groupBy(projectTemplatePhase.templateId);
  const taskByTemplate = new Map(counts.map((c) => [c.templateId, c.taskCount]));
  const phaseByTemplate = new Map(phaseCounts.map((c) => [c.templateId, c.phaseCount]));
  return {
    items: rows.map((r) =>
      toTemplateListItem(r, {
        phaseCount: phaseByTemplate.get(r.id) ?? 0,
        taskCount: taskByTemplate.get(r.id) ?? 0,
      }),
    ),
    total,
  };
}

/** Loads the phases (in order) and tasks of one template, splitting tasks into their phase vs. loose. */
async function loadPhasesAndTasks(templateId: string) {
  const [phaseRows, taskRows] = await Promise.all([
    db
      .select()
      .from(projectTemplatePhase)
      .where(eq(projectTemplatePhase.templateId, templateId))
      .orderBy(asc(projectTemplatePhase.position)),
    db
      .select()
      .from(projectTemplateTask)
      .where(eq(projectTemplateTask.templateId, templateId))
      .orderBy(asc(projectTemplateTask.position)),
  ]);
  const tasksByPhase = new Map<string, TemplateTaskDto[]>();
  const looseTasks: TemplateTaskDto[] = [];
  for (const row of taskRows) {
    const dto = toTemplateTaskDto(row);
    if (row.templatePhaseId) {
      const list = tasksByPhase.get(row.templatePhaseId) ?? [];
      list.push(dto);
      tasksByPhase.set(row.templatePhaseId, list);
    } else {
      looseTasks.push(dto);
    }
  }
  const phases = phaseRows.map((row) => toTemplatePhaseDto(row, tasksByPhase.get(row.id) ?? []));
  return { phases, looseTasks };
}

/** One template with its phases/tasks, or null when it is missing or not the caller's own (D8-style). */
export async function getTemplateDetail(p: Principal, id: string): Promise<TemplateDetail | null> {
  const [row] = await db.select().from(projectTemplate).where(eq(projectTemplate.id, id));
  if (!row || !canUseTemplate(p, row).ok) return null;
  const { phases, looseTasks } = await loadPhasesAndTasks(id);
  return toTemplateDetail(row, phases, looseTasks);
}
