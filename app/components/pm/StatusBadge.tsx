import type { ProjectStatus, TaskStatus } from '@server/pm/enums';
import { PROJECT_STATUS_LABELS, TASK_STATUS_LABELS } from '~/lib/pm-labels';
import { LabelBadge } from './LabelBadge';

// The two tables only share `canceled`, which reads the same in both, so one lookup serves tasks and projects.
const STATUS_LABELS = { ...PROJECT_STATUS_LABELS, ...TASK_STATUS_LABELS };

/** Badge for a task or project status, always icon plus text (R05 §3.4 #8). */
export function StatusBadge({ status }: { status: TaskStatus | ProjectStatus }) {
  return <LabelBadge spec={STATUS_LABELS[status]} />;
}
