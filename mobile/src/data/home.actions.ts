/*
 * What Home writes: the one button a My Focus row may have.
 *
 * Which button that is, is the server's call (`focus.items[].action`, built from its own
 * `canCompleteTask` / `canStartTask` policy), so there is no permission rule here — the row simply
 * posts the step it was given. Both are task workflow routes (`server/api/app-tasks.workflow.ts`).
 *
 * `write()` marks stale only after the server accepted the change. Named here: Home itself (Focus,
 * the briefing, Done this week, the activity feed all move) and the Inbox (finishing a task writes
 * cards for the people watching it).
 *
 * KNOWN GAP for whoever merges the Tugas module: the Tugas list has its own resource once that wave
 * lands, and it belongs in these lists too. It does not exist yet, so it cannot be named here.
 */
import { apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { homeResource } from './home.api';
import type { FocusTask } from './home.types';
import { inboxActionResource, inboxCountResource, inboxInfoResource } from './inbox.api';
import { write } from './resource';

/** The stores a finished or started task can change. */
const TOUCHED = [homeResource, inboxActionResource, inboxInfoResource, inboxCountResource];

/** A write outside a resource routes its own failure to the session, then re-throws (pattern §3). */
async function step(id: string, action: 'complete' | 'start'): Promise<void> {
  try {
    await apiPost<unknown>(`/api/app/tasks/${id}/${action}`);
  } catch (failure) {
    if (isApiError(failure)) applyApiError(failure);
    throw failure;
  }
}

/**
 * Runs a focus row's own button. A row the server offered no button on throws rather than guessing
 * a step for it: that would be the client-side permission rule the map rules out.
 */
export function runFocusAction(task: Pick<FocusTask, 'id' | 'no' | 'action'>): Promise<void> {
  if (!task.action) {
    throw new Error(
      `Task #${task.no} has no action on Home: the server offered neither "complete" nor "start".`,
    );
  }
  return write(() => step(task.id, task.action as 'complete' | 'start'), TOUCHED);
}
