/** Sizes and colours of the project timeline; every length is rem/em times the user's text scale (X1 D2). */
import type { ProjectListItem } from '@server/project/project.dto';
import { PROJECT_STATUS_LABELS } from '~/lib/pm-labels';

/** `n` rem that follows the text-size setting, like Mantine's own `rem()`. */
export const scaledRem = (n: number) => `calc(${n}rem * var(--mantine-scale))`;

/** Sticky label column: narrow on phones so the timeline keeps most of the screen. */
export const LABEL_WIDTH = { base: scaledRem(9.5), sm: scaledRem(16) };
export const BAR_MIN_WIDTH = scaledRem(0.75);
export const GRID_LINE = '1px solid var(--mantine-color-default-border)';

const CONDITION_COLOR = { on_track: 'ok', at_risk: 'warn', off_track: 'danger' } as const;

/** Colour token of a project's bar: its condition when it has one, else its status. Never the only cue. */
export function ganttColor(p: Pick<ProjectListItem, 'condition' | 'status'>): string {
  return p.condition ? CONDITION_COLOR[p.condition.level] : PROJECT_STATUS_LABELS[p.status].color;
}

export const filled = (color: string) => `var(--mantine-color-${color}-filled)`;
export const light = (color: string) => `var(--mantine-color-${color}-light)`;
