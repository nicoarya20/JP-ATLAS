/**
 * "Ceritakan proyeknya": turns a story into a draft project (name, dates, phases, tasks). It writes
 * nothing: it checks the same permission as creating a project, asks the provider for a structured
 * draft, validates it, and lets the code (not the model) match names and compute dates. Logs carry
 * ids, latency and an outcome word only: never the story or the draft itself.
 *
 * TODO(project-draft): model AI diatur lewat profil envman (`envman run claude:nico-opus`) saat
 * sesi implementasi dimulai — konfirmasi ke coordinator apakah ini perlu env var baru atau cukup
 * pakai ANTHROPIC_API_KEY/TASK_AI_MODEL yang sudah ada. Sampai ada jawaban baru, modul ini tetap
 * memakai `aiConfig()` apa adanya (plan §1.1, §11): tidak ada env var model terpisah ditambahkan di
 * sini.
 */
import { canCreateProject } from '../access/project.policy';
import type { Principal } from '../access/types';
import { logger } from '../logger';
import type { PmCode } from '../pm/errors';
import type { TaskClock } from '../task/task.dto';
import { aiConfig } from './ai.config';
import { AiUnavailableError, callTool } from './anthropic.client';
import { composeProjectDraft } from './project-draft.compose';
import { PROJECT_DRAFT_CODES, PROJECT_DRAFT_TEXT_MAX } from './project-draft.limits';
import { buildPrompt, DRAFT_TOOL } from './project-draft.prompt';
import { parseModelOutput } from './project-draft.schema';
import type { ProjectDraftResponse } from './project-draft.types';
import { draftLimiter } from './task-draft.service';

const MS_PER_SECOND = 1000;

export type ProjectDraftFailureCode =
  | PmCode
  | (typeof PROJECT_DRAFT_CODES)[keyof typeof PROJECT_DRAFT_CODES];

export type ProjectDraftResult =
  | { ok: true; body: ProjectDraftResponse }
  | { ok: false; code: ProjectDraftFailureCode; retryAfterSeconds?: number };

const refused = (code: ProjectDraftFailureCode): ProjectDraftResult => ({ ok: false, code });

/** Drafts a project for `text`; see `project-draft.types.ts` for the answers. */
export async function draftProject(
  principal: Principal,
  input: { text: string },
  clock: TaskClock,
): Promise<ProjectDraftResult> {
  const text = input.text.trim();
  if (!text) return refused(PROJECT_DRAFT_CODES.textEmpty);
  if (text.length > PROJECT_DRAFT_TEXT_MAX) return refused(PROJECT_DRAFT_CODES.textTooLong);

  // No project exists yet, so this is a pure role check (unlike `loadDraftContext` in
  // `task-draft.service.ts`, which also loads members/kinds of an existing project).
  const allowed = canCreateProject(principal);
  if (!allowed.ok) return refused(allowed.code);

  const cfg = aiConfig();
  if (!cfg) return refused(PROJECT_DRAFT_CODES.disabled);

  // Shared bucket with "Tulis saja ✦" (plan §1.2): the two features spend from one per-user quota.
  const limit = draftLimiter.check(`u:${principal.id}`);
  if (limit.limited) {
    logger.warn({ userId: principal.id }, 'project draft rate limited');
    const retryAfterSeconds = Math.max(1, Math.ceil(limit.retryAfterMs / MS_PER_SECOND));
    return { ok: false, code: 'RATE_LIMITED', retryAfterSeconds };
  }

  const prompt = buildPrompt({ text });
  const started = performance.now();
  const log = { userId: principal.id };
  const latency = () => Math.round(performance.now() - started);
  try {
    const answer = await callTool(cfg, { ...prompt, tool: DRAFT_TOOL });
    const parsed = parseModelOutput(answer);
    if (!parsed) {
      logger.warn(
        { ...log, latencyMs: latency(), outcome: 'bad_output' },
        'project draft unusable',
      );
      return refused(PROJECT_DRAFT_CODES.unavailable);
    }
    const body = composeProjectDraft(parsed, { today: clock.today });
    logger.info(
      {
        ...log,
        latencyMs: latency(),
        outcome: 'ok',
        phases: body.draft?.phases.length ?? 0,
        tasks:
          (body.draft?.phases.reduce((n, p) => n + p.tasks.length, 0) ?? 0) +
          (body.draft?.looseTasks.length ?? 0),
        asked: body.question !== null,
      },
      'project draft composed',
    );
    return { ok: true, body };
  } catch (e) {
    if (!(e instanceof AiUnavailableError)) throw e;
    logger.warn(
      { ...log, latencyMs: latency(), outcome: e.reason, providerStatus: e.httpStatus },
      'project draft provider unavailable',
    );
    return refused(PROJECT_DRAFT_CODES.unavailable);
  }
}
