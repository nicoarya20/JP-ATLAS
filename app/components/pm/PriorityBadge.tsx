import type { ProjectPriority } from '@server/pm/enums';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import { LabelBadge } from './LabelBadge';

/** Badge for a project or task priority, always icon plus text. */
export function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  return <LabelBadge spec={PRIORITY_LABELS[priority]} />;
}
