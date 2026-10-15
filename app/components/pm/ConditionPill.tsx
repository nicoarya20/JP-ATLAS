import type { ProjectCondition } from '@server/pm/enums';
import { CONDITION_LABELS } from '~/lib/pm-labels';
import { LabelBadge } from './LabelBadge';

/** Pill for the computed project condition (Lancar / Perlu perhatian / Terlambat), icon plus text. */
export function ConditionPill({ condition }: { condition: ProjectCondition }) {
  return <LabelBadge spec={CONDITION_LABELS[condition]} />;
}
