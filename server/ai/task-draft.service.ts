/**
 * "Tulis saja ✦" (A1): turns a story into draft tasks. It writes nothing: it checks the same
 * permission as creating a task, asks the provider for a structured draft, validates it, and lets
 * the code (not the model) match names and compute dates. Logs carry ids, latency and an outcome
 * word only: never the story, the answer or a provider message.
 */
import type { Principal } from '../access/types';
import { logger } from '../logger';
import type { PmCode } from '../pm/errors';
import { RateLimiter } from '../rate-limit';
import type { TaskClock } from '../task/task.dto';
import { aiConfig } from './ai.config';
import { AiUnavailableError, callTool } from './anthropic.client';
import { composeDrafts } from './task-draft.compose';
import {
  TASK_DRAFT_CODES,
  TASK_DRAFT_RATE_MAX,
  TASK_DRAFT_RATE_WINDOW_MS,
  TASK_DRAFT_TEXT_MAX,
} from './task-draft.limits';
import { buildPrompt, DRAFT_TOOL } from './task-draft.prompt';
import { loadDraftContext } from './task-draft.query';
import { parseModelOutput } from './task-draft.schema';
import type { TaskDraftResponse } from './task-draft.types';

const MS_PER_SECOND = 1000;

/** Per-user cap on provider calls, in memory per process like the write limiter. Exported for tests. */
export const draftLimiter = new RateLimiter({
  windowMs: TASK_DRAFT_RATE_WINDOW_MS,
  limit: TASK_DRAFT_RATE_MAX,
  excludePrefixes: [],
});

export type DraftFailureCode = PmCode | (typeof TASK_DRAFT_CODES)[keyof typeof TASK_DRAFT_CODES];

export type DraftResult =
  | { ok: true; body: TaskDraftResponse }
  | { ok: false; code: DraftFailureCode; retryAfterSeconds?: number };

const refused = (code: DraftFailureCode): DraftResult => ({ ok: false, code });

/** Drafts tasks for `text` in `projectId`; see `task-draft.types.ts` for the answers. */
export async function draftTasks(
  principal: Principal,
  input: { projectId: string; text: string },
  clock: TaskClock,
): Promise<DraftResult> {
  const text = input.text.trim();
  if (!text) return refused(TASK_DRAFT_CODES.textEmpty);
  if (text.length > TASK_DRAFT_TEXT_MAX) return refused(TASK_DRAFT_CODES.textTooLong);

  const ctx = await loadDraftContext(principal, input.projectId);
  if (!ctx.ok) return refused(ctx.code);
  const cfg = aiConfig();
  if (!cfg) return refused(TASK_DRAFT_CODES.disabled);

  const limit = draftLimiter.check(`u:${principal.id}`);
  if (limit.limited) {
    logger.warn({ userId: principal.id, projectId: input.projectId }, 'task draft rate limited');
    const retryAfterSeconds = Math.max(1, Math.ceil(limit.retryAfterMs / MS_PER_SECOND));
    return { ok: false, code: 'RATE_LIMITED', retryAfterSeconds };
  }

  const prompt = buildPrompt({
    text,
    memberNames: ctx.members.map((m) => m.name),
    kindNames: ctx.kinds.map((k) => k.name),
  });
  const started = performance.now();
  const log = { userId: principal.id, projectId: input.projectId };
  const latency = () => Math.round(performance.now() - started);
  try {
    const answer = await callTool(cfg, { ...prompt, tool: DRAFT_TOOL });
    const parsed = parseModelOutput(answer);
    if (!parsed) {
      logger.warn({ ...log, latencyMs: latency(), outcome: 'bad_output' }, 'task draft unusable');
      return refused(TASK_DRAFT_CODES.unavailable);
    }
    const body = composeDrafts(parsed, {
      members: ctx.members,
      kinds: ctx.kinds,
      actorId: principal.id,
      today: clock.today,
    });
    logger.info(
      {
        ...log,
        latencyMs: latency(),
        outcome: 'ok',
        drafts: body.drafts.length,
        asked: body.question !== null,
      },
      'task draft composed',
    );
    return { ok: true, body };
  } catch (e) {
    if (!(e instanceof AiUnavailableError)) throw e;
    logger.warn(
      { ...log, latencyMs: latency(), outcome: e.reason, providerStatus: e.httpStatus },
      'task draft provider unavailable',
    );
    return refused(TASK_DRAFT_CODES.unavailable);
  }
}
