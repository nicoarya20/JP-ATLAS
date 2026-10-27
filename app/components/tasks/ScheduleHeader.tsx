/** Heading of one "Tugas saya" schedule group with its count, e.g. "Terlambat (2)" (P3 §2 Tugas ①). */
import { Title } from '@mantine/core';
import type { ScheduleGroup } from '@server/metrics/schedule';
import { LIST_COPY, SCHEDULE_GROUP_LABELS } from './tasks.copy';

/** Id of the heading, for the section's `aria-labelledby`. */
export const scheduleHeadingId = (group: ScheduleGroup) => `task-group-${group}`;

type Props = {
  group: ScheduleGroup;
  /** Server count, or the loaded rows ("30+" while more pages wait) when filters narrow the group. */
  count: number | string;
};

/**
 * The handoff defines three heading sizes (page 32, section 20, body) and no h4, so a group
 * heading takes the section size while staying an h2 in the page outline.
 */
export function ScheduleHeader({ group, count }: Props) {
  return (
    <Title order={2} size="h3" id={scheduleHeadingId(group)}>
      {LIST_COPY.groupCount(SCHEDULE_GROUP_LABELS[group], count)}
    </Title>
  );
}
