/**
 * "Latest Activity": the newest task changes and comments in my projects. Two statements (activity
 * rows, comment rows), each cut to the page size on its own `(task_id, created_at)` index and merged
 * here, so the cost stays constant however much history there is. Comment text is never read.
 */
import { and, desc, eq, notInArray, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { db } from '../db';
import { profile, project, task, taskActivity, taskComment, user } from '../db/schema';
import type { Executor } from '../pm/tx';
import { displayNameSql } from '../profile/profile.name';
import { liveTask, visibleTo } from '../task/task.sql';
import { activitySentence, whoLabel } from './home.activity';
import { HOME_ACTIVITY_MAX } from './home.config';
import type { HomeActivityItem } from './home.dto';
import { mineScope } from './home.scope';

/** Removing a comment is bookkeeping, not news. */
const SKIPPED_ACTIONS = ['comment.delete'];

export async function getActivity(p: Principal, exec: Executor = db): Promise<HomeActivityItem[]> {
  const visible = visibleTo(mineScope(p));
  const [changes, comments] = await Promise.all([
    exec
      .select({
        id: taskActivity.id,
        action: taskActivity.action,
        at: taskActivity.createdAt,
        actorId: taskActivity.actorId,
        keptName: taskActivity.actorName,
        name: displayNameSql,
        title: task.title,
        number: task.number,
        projectName: project.name,
      })
      .from(taskActivity)
      .innerJoin(task, eq(task.id, taskActivity.taskId))
      .innerJoin(project, eq(project.id, task.projectId))
      .leftJoin(user, eq(user.id, taskActivity.actorId))
      .leftJoin(profile, eq(profile.userId, user.id))
      .where(and(liveTask, visible, notInArray(taskActivity.action, SKIPPED_ACTIONS)))
      .orderBy(desc(taskActivity.createdAt), desc(taskActivity.id))
      .limit(HOME_ACTIVITY_MAX),
    exec
      .select({
        id: taskComment.id,
        at: taskComment.createdAt,
        actorId: taskComment.authorId,
        keptName: taskComment.authorName,
        name: displayNameSql,
        title: task.title,
        number: task.number,
        projectName: project.name,
      })
      .from(taskComment)
      .innerJoin(task, eq(task.id, taskComment.taskId))
      .innerJoin(project, eq(project.id, task.projectId))
      .leftJoin(user, eq(user.id, taskComment.authorId))
      .leftJoin(profile, eq(profile.userId, user.id))
      .where(and(liveTask, visible, sql`${taskComment.deletedAt} IS NULL`))
      .orderBy(desc(taskComment.createdAt), desc(taskComment.id))
      .limit(HOME_ACTIVITY_MAX),
  ]);
  const item = (kind: string, r: (typeof changes)[number] | (typeof comments)[number]) => {
    const action = 'action' in r ? r.action : 'comment';
    return {
      id: `${kind}:${r.id}`,
      at: r.at,
      text: activitySentence(action, whoLabel(p.id, r.actorId, r.name, r.keptName), r.title),
      projectName: r.projectName,
      taskNumber: r.number,
    };
  };
  return [...changes.map((r) => item('a', r)), ...comments.map((r) => item('c', r))]
    .sort((a, b) => b.at.getTime() - a.at.getTime() || b.id.localeCompare(a.id))
    .slice(0, HOME_ACTIVITY_MAX)
    .map((r): HomeActivityItem => ({ ...r, at: r.at.toISOString() }));
}
