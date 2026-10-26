/*
 * Project settings of the Tasks module (prototype tasks.settings.jsx, tasks.form.jsx): whether new tasks need review,
 * the task type limit, and the phases a task can sit in. Projects without an entry have review off and no phases.
 */

/** Most task types a project may keep active. */
export const TASK_TYPE_MAX = 6;

/** "New tasks need review" per project id (the prototype shows Atlas as Off). */
export const NEEDS_REVIEW: Record<string, boolean> = {
  atlas: false,
};

/**
 * Phases a task can be put in, and the phase new tasks start in, per project id. Mirrors the Atlas phases of the
 * prototype's projects data (D.atlas.phases, phaseNow) until the Projects module owns them.
 */
export const TASK_PHASES: Record<string, { phases: string[]; now: string }> = {
  atlas: { phases: ['Planning', 'Development', 'Testing', 'Release'], now: 'Development' },
};
