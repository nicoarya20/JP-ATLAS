/** Sizes and colours of the project timeline; every length is rem/em times the user's text scale (X1 D2). */
import type { PhaseStatus } from '@server/pm/enums';
import type { ProjectListItem } from '@server/project/project.dto';
import type { CSSProperties } from 'react';
import { PROJECT_STATUS_LABELS } from '~/lib/pm-labels';

/** `n` rem that follows the text-size setting, like Mantine's own `rem()`. */
export const scaledRem = (n: number) => `calc(${n}rem * var(--mantine-scale))`;

/** Sticky label column: narrow on phones so the timeline keeps most of the screen. */
export const LABEL_WIDTH = { base: scaledRem(9.5), sm: scaledRem(16) };
export const BAR_MIN_WIDTH = scaledRem(0.75);
export const GRID_LINE_COLOR = 'var(--mantine-color-default-border)';
export const GRID_LINE = `1px solid ${GRID_LINE_COLOR}`;

const CONDITION_COLOR = { on_track: 'ok', at_risk: 'warn', off_track: 'danger' } as const;

/** Colour token of a project's bar: its condition when it has one, else its status. Never the only cue. */
export function ganttColor(p: Pick<ProjectListItem, 'condition' | 'status'>): string {
  return p.condition ? CONDITION_COLOR[p.condition.level] : PROJECT_STATUS_LABELS[p.status].color;
}

export const filled = (color: string) => `var(--mantine-color-${color}-filled)`;
export const light = (color: string) => `var(--mantine-color-${color}-light)`;

// ---- Stages (inside the bar) and milestones (above it) ----

const BAR_HEIGHT_EM = 1.75;
/** A bar that carries stages grows by one lane so the stage pieces never cover the progress fill. */
const BAR_STAGES_HEIGHT_EM = 2.75;
const STAGE_HEIGHT_EM = 1;
/** Space between a stage piece and the bar's bottom edge (the bar border is 2px). */
const STAGE_INSET_EM = 0.2;
/** Distance of a milestone diamond's centre above the bar's top edge. */
const MILESTONE_RISE_EM = 0.8;
export const MILESTONE_SIZE_EM = 0.9;
const BODY = 'var(--mantine-color-body)';

export const barHeight = (hasStages: boolean) =>
  `${hasStages ? BAR_STAGES_HEIGHT_EM : BAR_HEIGHT_EM}em`;
/** Rows with stages or milestones need more room above and below the bar. */
export const rowMinHeight = (hasExtras: boolean) => scaledRem(hasExtras ? 5.5 : 4.5);

/** Top of the stage lane: the bottom of the bar, measured from the row's middle (the bar is centred). */
export const stageTop = () =>
  `calc(50% + ${BAR_STAGES_HEIGHT_EM / 2 - STAGE_HEIGHT_EM - STAGE_INSET_EM}em)`;
export const stageHeight = () => `${STAGE_HEIGHT_EM}em`;

/** Centre of a milestone diamond, above the bar (taller when the bar has stages). */
export const milestoneTop = (hasStages: boolean) =>
  `calc(50% - ${(hasStages ? BAR_STAGES_HEIGHT_EM : BAR_HEIGHT_EM) / 2 + MILESTONE_RISE_EM}em)`;

/** Done = solid, running = striped, not started = hollow with a dashed edge: readable without colour. */
export function stageStyle(status: PhaseStatus, color: string): CSSProperties {
  const edge = filled(color);
  if (status === 'done') return { background: edge, border: `1px solid ${edge}` };
  if (status === 'in_progress') {
    return {
      background: `repeating-linear-gradient(135deg, ${edge} 0 0.3em, ${BODY} 0.3em 0.6em)`,
      border: `1px solid ${edge}`,
    };
  }
  return { background: BODY, border: `1px dashed ${edge}` };
}

/** Reached = filled diamond, not reached = hollow; the text colour keeps it visible on both themes. */
export function milestoneStyle(reached: boolean): CSSProperties {
  return {
    background: reached ? 'var(--mantine-color-text)' : BODY,
    border: '2px solid var(--mantine-color-text)',
  };
}
