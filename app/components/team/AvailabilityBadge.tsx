/** Leave status of a person: icon and words, never colour alone; nothing is drawn when there is none. */
import { Badge } from '@mantine/core';
import type { TeamAvailability } from '@server/team/team.dto';
import { FiClock, FiSun } from 'react-icons/fi';
import { availabilityText } from '~/lib/team-availability';

export function AvailabilityBadge({
  availability,
}: {
  availability: TeamAvailability | undefined;
}) {
  const text = availabilityText(availability);
  if (!availability || !text) return null;
  const onLeave = availability.kind === 'on_leave';
  const Icon = onLeave ? FiSun : FiClock;
  return (
    <Badge
      variant="light"
      color={onLeave ? 'warn' : 'gray'}
      leftSection={<Icon size="1.25em" aria-hidden />}
      // Long wording wraps on a 375 px card instead of running off it.
      style={{ height: 'auto', maxWidth: '100%', minHeight: 'var(--badge-height)' }}
      styles={{ label: { whiteSpace: 'normal', overflowWrap: 'anywhere' } }}
    >
      {text}
    </Badge>
  );
}
