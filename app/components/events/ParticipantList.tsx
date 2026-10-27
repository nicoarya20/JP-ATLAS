import { Group, Stack, Text } from '@mantine/core';
import { FiUsers } from 'react-icons/fi';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import type { PersonRef } from '~/lib/events-api';
import { EVENTS_COPY } from './events.copy';

/** "3 peserta" with a users icon; `invited` adds that the viewer is one of them. */
export function ParticipantCount({ total, invited }: { total: number; invited: boolean }) {
  return (
    <Group gap={4} wrap="nowrap" c="dimmed">
      <FiUsers size="1.25em" aria-hidden />
      <Text size="xs" c="inherit">
        {invited
          ? `${EVENTS_COPY.participants(total)} · ${EVENTS_COPY.invited}`
          : EVENTS_COPY.participants(total)}
      </Text>
    </Group>
  );
}

/** Guests by name only (Q8: never an email or a phone number). */
export function ParticipantList({ people }: { people: readonly PersonRef[] }) {
  if (people.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {EVENTS_COPY.noParticipants}
      </Text>
    );
  }
  return (
    <Stack
      component="ul"
      gap="xs"
      aria-label={EVENTS_COPY.participantsLabel}
      m={0}
      p={0}
      // Mantine has no `list-style` style prop; `List` would change the markup of the rows.
      style={{ listStyle: 'none' }}
    >
      {people.map((p) => (
        <li key={p.id}>
          <Group gap="xs" wrap="nowrap">
            <MemberAvatar name={p.name} />
            {/* One guest per row: truncated, so the rows all keep the same height (K-5). */}
            <Text size="sm" miw={0} truncate>
              {p.name}
            </Text>
          </Group>
        </li>
      ))}
    </Stack>
  );
}
