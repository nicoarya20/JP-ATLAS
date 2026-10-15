import type { TaskLabel } from '@server/metrics/types';
import { TASK_LABEL_LABELS } from '~/lib/pm-labels';
import { LabelBadge } from './LabelBadge';

/** Chip for the single extra state of a task row (terlambat, tertahan, ...); "today" is a group, not a label (M13). */
export function TaskLabelChip({ label }: { label: TaskLabel }) {
  return <LabelBadge spec={TASK_LABEL_LABELS[label]} />;
}
