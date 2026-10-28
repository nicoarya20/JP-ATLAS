/*
 * What Home writes: the one button a My Focus row may have.
 *
 * Which button that is, is the server's call (`focus.items[].action`, built from its own
 * `canCompleteTask` / `canStartTask` policy), so there is no permission rule here — the row simply
 * posts the step it was given. Both are task workflow routes (`server/api/app-tasks.workflow.ts`),
 * the ones the web's Beranda uses.
 *
 * `write()` marks stale only after the server accepted the change. Named here: Home itself (Focus,
 * the chips, the briefing, Done this week and the activity feed all move). The Tasks list and
 * `tasks/counts` have no resource yet; they join this list in the Tasks wave, and the Inbox's
 * resources when Inbox is wired (finishing a task writes cards for the people watching it).
 */
import { apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { homeResource } from './home.api';
import type { FocusTask } from './home.types';
import { write } from './resource';

/** The stores a finished or started task can change. */
const TOUCHED = [homeResource];

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
  const { action } = task;
  if (!action) {
    throw new Error(
      `Task #${task.no} has no action on Home: the server offered neither "complete" nor "start".`,
    );
  }
  return write(() => step(task.id, action), TOUCHED);
}
