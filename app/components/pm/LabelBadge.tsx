import { Badge } from '@mantine/core';
import type { PmLabel } from '~/lib/pm-labels';

/** Shared light badge for every PM label: icon and words together so colour is never the only cue (WCAG 1.4.1). */
export function LabelBadge({ spec }: { spec: PmLabel }) {
  const Icon = spec.icon;
  return (
    <Badge
      variant="light"
      color={spec.color}
      // Labels are sentences in Indonesian ("Menunggu diperiksa saya"), so no forced uppercase.
      tt="none"
      leftSection={<Icon size="1.25em" aria-hidden />}
    >
      {spec.label}
    </Badge>
  );
}
