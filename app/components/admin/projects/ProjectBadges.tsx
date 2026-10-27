/** Status, condition and priority badges for the Admin project list — icon + text, never colour alone. */
import { Badge, Text } from '@mantine/core';
import type { ProjectConditionDto } from '@server/project/project.dto';
import type { ProjectPriority, ProjectStatus } from '@server/pm/enums';
import { CONDITION_LABELS, PRIORITY_LABELS, PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import { ADMIN_PROJECTS_COPY } from './projects.copy';

type BadgeSize = 'sm' | 'md';

export function StatusBadge({ status, size = 'sm' }: { status: ProjectStatus; size?: BadgeSize }) {
  const { label, icon: Icon, color } = PROJECT_STATUS_LABELS[status];
  return (
    <Badge size={size} color={color} variant="light" leftSection={<Icon size="1em" aria-hidden />}>
      {label}
    </Badge>
  );
}

export function PriorityBadge({
  priority,
  size = 'sm',
}: {
  priority: ProjectPriority;
  size?: BadgeSize;
}) {
  const { label, icon: Icon, color } = PRIORITY_LABELS[priority];
  return (
    <Badge size={size} color={color} variant="light" leftSection={<Icon size="1em" aria-hidden />}>
      {label}
    </Badge>
  );
}

/** Condition is only set for `active` projects; a null condition renders a plain dash. */
export function ConditionBadge({
  condition,
  size = 'sm',
}: {
  condition: ProjectConditionDto | null;
  size?: BadgeSize;
}) {
  if (!condition)
    return (
      <Text size="sm" c="dimmed">
        {ADMIN_PROJECTS_COPY.noCondition}
      </Text>
    );
  const { label, icon: Icon, color } = CONDITION_LABELS[condition.level];
  return (
    <Badge
      size={size}
      color={color}
      variant="light"
      leftSection={<Icon size="1em" aria-hidden />}
      title={condition.reason ?? undefined}
    >
      {label}
    </Badge>
  );
}
