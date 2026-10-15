/** Test cleanup (S0B-21): tracks the rows a test creates and deletes exactly those ids, children before parents. */
import { inArray } from 'drizzle-orm';
import { db } from '../../server/db';
import {
  auditLog,
  project,
  task,
  taskActivity,
  taskChecklistItem,
  taskComment,
  user,
  userInvitation,
} from '../../server/db/schema';

/**
 * Delete order, children first. Mirrors the real foreign keys: task parts (checklist, comment,
 * activity) hang off `task`, tasks off `project`; invitations, audit rows and projects point at
 * `user` with SET NULL, so users go last and nothing is left dangling if a step is skipped.
 */
export const CLEANUP_ORDER = [
  'taskPart',
  'task',
  'project',
  'invitation',
  'audit',
  'user',
] as const;
export type CleanupKind = (typeof CLEANUP_ORDER)[number];

/** Removes the rows of one kind by id; swapped out in tests to observe order and failures. */
export type Deleter = (kind: CleanupKind, ids: string[]) => Promise<void>;

// Keeps one statement's parameter list far below Postgres' 65535 bind limit when a suite tracks thousands of tasks.
const DELETE_CHUNK = 1_000;

const dbDeleter: Deleter = async (kind, ids) => {
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const part = ids.slice(i, i + DELETE_CHUNK);
    switch (kind) {
      case 'taskPart':
        // Ids are random uuids, so a tracked id can only exist in one of the three tables.
        await db.delete(taskChecklistItem).where(inArray(taskChecklistItem.id, part));
        await db.delete(taskComment).where(inArray(taskComment.id, part));
        await db.delete(taskActivity).where(inArray(taskActivity.id, part));
        break;
      case 'task':
        await db.delete(task).where(inArray(task.id, part));
        break;
      case 'project':
        await db.delete(project).where(inArray(project.id, part));
        break;
      case 'invitation':
        await db.delete(userInvitation).where(inArray(userInvitation.id, part));
        break;
      case 'audit':
        await db.delete(auditLog).where(inArray(auditLog.id, part));
        break;
      case 'user':
        await db.delete(user).where(inArray(user.id, part));
        break;
    }
  }
};

export type Cleaner = {
  /** Remembers `id` for deletion and returns it, so creation sites can write `track('user', row.id)`. */
  track(kind: CleanupKind, id: string): string;
  /** Runs `fn` with every `track` call kept for the whole file (beforeAll data), not just one test. */
  shared<T>(fn: () => Promise<T>): Promise<T>;
  /** Deletes what the current test tracked; wire into `afterEach`. */
  flushTest(): Promise<void>;
  /** Deletes everything still tracked, shared data included; wire into `afterAll`. */
  flushAll(): Promise<void>;
};

type Bucket = Map<CleanupKind, Set<string>>;

/** Creates a cleaner; failures never stop later steps and surface together as one `AggregateError`. */
export function createCleaner(deleter: Deleter = dbDeleter): Cleaner {
  const perTest: Bucket = new Map();
  const perFile: Bucket = new Map();
  let sharedDepth = 0;

  async function flush(buckets: Bucket[]) {
    // Take the ids first: a failed delete must be reported once, not retried by every later flush.
    const taken = new Map<CleanupKind, Set<string>>();
    for (const bucket of buckets) {
      for (const [kind, ids] of bucket) {
        const merged = taken.get(kind) ?? new Set<string>();
        for (const id of ids) merged.add(id);
        taken.set(kind, merged);
      }
      bucket.clear();
    }
    const errors: Error[] = [];
    for (const kind of CLEANUP_ORDER) {
      const ids = [...(taken.get(kind) ?? [])];
      if (ids.length === 0) continue;
      try {
        await deleter(kind, ids);
      } catch (cause) {
        const why = cause instanceof Error ? cause.message : String(cause);
        errors.push(new Error(`cleanup of ${ids.length} ${kind} row(s) failed: ${why}`, { cause }));
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, `Test cleanup failed in ${errors.length} step(s)`);
    }
  }

  return {
    track(kind, id) {
      const bucket = sharedDepth > 0 ? perFile : perTest;
      const ids = bucket.get(kind) ?? new Set<string>();
      ids.add(id);
      bucket.set(kind, ids);
      return id;
    },
    async shared(fn) {
      sharedDepth++;
      try {
        return await fn();
      } finally {
        sharedDepth--;
      }
    },
    flushTest: () => flush([perTest]),
    flushAll: () => flush([perTest, perFile]),
  };
}
