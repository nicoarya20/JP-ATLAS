/**
 * Keyset page readers behind `GET /api/admin/export/:kind` (P11 AD-10). Every kind reads one page
 * ordered by its primary key, so the route streams a table of any size without holding it
 * (P11 §8 R5); relation columns (pengelola, proyek, penanggung jawab) come from a LEFT JOIN in the
 * same statement, never a lookup per row. No password hash, token, session or API-key column is
 * selected anywhere in this file, so a secret cannot reach a CSV by accident.
 */
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db';
import { project, task, user } from '../db/schema';
import { normalizeRole } from '../permissions';
import type { Executor } from '../pm/tx';
import type { CsvPage, CsvSource } from './admin-export.csv';
import type { ExportKind } from './admin-export.kinds';
import { realUser } from './admin-users.query';

/** Empty instead of the word "null": a spreadsheet should show a blank cell for a missing value. */
const text = (value: string | null | undefined) => value ?? '';
const stamp = (value: Date | null | undefined) => (value ? value.toISOString() : '');
const flag = (value: boolean | null | undefined) => (value ? 'ya' : 'tidak');

/** A full page hands its last id to the next read; a short page was the last one. */
function nextCursor(rows: ReadonlyArray<{ id: string }>, limit: number): string | null {
  return rows.length === limit ? (rows[rows.length - 1]?.id ?? null) : null;
}

const MEMBER_HEADER = [
  'id',
  'nama',
  'email',
  'peran',
  'status_persetujuan',
  'diblokir',
  'dibuat_pada',
] as const;

async function readMembers(cursor: string | null, limit: number, exec: Executor): Promise<CsvPage> {
  const rows = await exec
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    // `realUser` keeps leftover anonymous demo rows out, exactly like the admin directory.
    .where(and(realUser, cursor === null ? undefined : gt(user.id, cursor)))
    .orderBy(asc(user.id))
    .limit(limit);
  return {
    rows: rows.map((r) => [
      r.id,
      r.name,
      r.email,
      // Legacy `'user'` and NULL roles read as member, the same answer the console shows.
      normalizeRole(r.role),
      r.approvalStatus,
      flag(r.banned),
      stamp(r.createdAt),
    ]),
    cursor: nextCursor(rows, limit),
  };
}

const PROJECT_HEADER = [
  'id',
  'nama',
  'status',
  'prioritas',
  'pengelola',
  'email_pengelola',
  'mulai',
  'tenggat',
  'selesai_pada',
  'dibuat_pada',
] as const;

async function readProjects(
  cursor: string | null,
  limit: number,
  exec: Executor,
): Promise<CsvPage> {
  const rows = await exec
    .select({
      id: project.id,
      name: project.name,
      status: project.status,
      priority: project.priority,
      leadName: user.name,
      leadEmail: user.email,
      startDate: project.startDate,
      dueDate: project.dueDate,
      completedAt: project.completedAt,
      createdAt: project.createdAt,
    })
    .from(project)
    // The lead's name in the same statement: a per-row lookup here would be the N+1 of P11 §8 R6.
    .leftJoin(user, eq(project.leadId, user.id))
    // Trashed projects stay out: this export answers "what is running", not what is in the bin.
    .where(and(isNull(project.deletedAt), cursor === null ? undefined : gt(project.id, cursor)))
    .orderBy(asc(project.id))
    .limit(limit);
  return {
    rows: rows.map((r) => [
      r.id,
      r.name,
      r.status,
      r.priority,
      text(r.leadName),
      text(r.leadEmail),
      text(r.startDate),
      text(r.dueDate),
      stamp(r.completedAt),
      stamp(r.createdAt),
    ]),
    cursor: nextCursor(rows, limit),
  };
}

/** `task` joins `user` twice over (assignee, and nothing else), so the assignee needs its own alias. */
const assignee = alias(user, 'export_assignee');

const TASK_HEADER = [
  'id',
  'nomor',
  'proyek',
  'judul',
  'status',
  'prioritas',
  'penanggung_jawab',
  'mulai',
  'tenggat',
  'selesai_pada',
  'dibuat_pada',
] as const;

async function readTasks(cursor: string | null, limit: number, exec: Executor): Promise<CsvPage> {
  const rows = await exec
    .select({
      id: task.id,
      number: task.number,
      projectName: project.name,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assigneeName: assignee.name,
      startDate: task.startDate,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
    })
    .from(task)
    // Both relation columns come from joins, so the statement count never depends on the row count.
    .leftJoin(project, eq(task.projectId, project.id))
    .leftJoin(assignee, eq(task.assigneeId, assignee.id))
    .where(and(isNull(task.deletedAt), cursor === null ? undefined : gt(task.id, cursor)))
    .orderBy(asc(task.id))
    .limit(limit);
  return {
    rows: rows.map((r) => [
      r.id,
      String(r.number),
      text(r.projectName),
      r.title,
      r.status,
      r.priority,
      text(r.assigneeName),
      text(r.startDate),
      text(r.dueDate),
      stamp(r.completedAt),
      stamp(r.createdAt),
    ]),
    cursor: nextCursor(rows, limit),
  };
}

export type ExportSource = CsvSource & { kind: ExportKind };

/** Header + page reader for one export. `exec` is swapped for a counting executor in tests. */
export function exportSource(kind: ExportKind, exec: Executor = db): ExportSource {
  switch (kind) {
    case 'members':
      return { kind, header: MEMBER_HEADER, readPage: (c, n) => readMembers(c, n, exec) };
    case 'projects':
      return { kind, header: PROJECT_HEADER, readPage: (c, n) => readProjects(c, n, exec) };
    case 'tasks':
      return { kind, header: TASK_HEADER, readPage: (c, n) => readTasks(c, n, exec) };
  }
}
