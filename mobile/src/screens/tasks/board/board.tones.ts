// Colours and icons of the Kanban statuses (prototype tasks.columns.js icons, tasks.css .tk-tone-*): a column's badge
// and a move-menu option read in their status's Atlas pair; To do has none, so it is muted text on the surface.
import { Circle, CircleCheck, CircleDashed, CircleDot, type LucideIcon } from 'lucide-react-native';

import type { BoardStatus, BoardTone } from '@/data/tasks.columns';

export const STATUS_ICON: Record<BoardStatus, LucideIcon> = {
  'To do': CircleDashed,
  'In progress': CircleDot,
  'In review': Circle,
  Done: CircleCheck,
};

/** Badge and resting option: tone text on its soft fill. */
export const TONE_SOFT: Record<BoardTone, { bg: string; text: string }> = {
  todo: { bg: 'bg-card', text: 'text-muted-foreground' },
  progress: { bg: 'bg-info-soft', text: 'text-info' },
  review: { bg: 'bg-warning-soft', text: 'text-warning' },
  done: { bg: 'bg-success-soft', text: 'text-success' },
};

/** The option aimed at: filled with its tone (To do's grey is too faint to fill, so it takes the label colour). */
export const TONE_FILL: Record<BoardTone, { bg: string; text: string }> = {
  todo: { bg: 'bg-foreground', text: 'text-background' },
  progress: { bg: 'bg-info', text: 'text-background' },
  review: { bg: 'bg-warning', text: 'text-background' },
  done: { bg: 'bg-success', text: 'text-background' },
};

/** CSS variable of each tone, for the ring's arc (an svg stroke takes a colour, not a class). */
export const TONE_VAR: Record<BoardTone, string> = {
  todo: '--color-foreground',
  progress: '--color-info',
  review: '--color-warning',
  done: '--color-success',
};
