import { Badge, Group, Stack, Text } from '@mantine/core';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import type { PersonRef } from '~/lib/events-api';
import { DETAIL_COPY } from './event-detail.copy';
import { EVENTS_COPY } from './events.copy';

type Props = { people: readonly PersonRef[]; creatorId: string | null };

/** The guest list by name only (Q8: never an email or a phone number); the creator carries a "Pembuat" mark. */
export function EventDetailPeople({ people, creatorId }: Props) {
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
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {people.map((p) => (
        <li key={p.id}>
          <Group gap="xs" wrap="wrap">
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <MemberAvatar name={p.name} />
              <Text size="sm" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                {p.name}
              </Text>
            </Group>
            {p.id === creatorId && (
              <Badge size="sm" variant="light" color="gray">
                {DETAIL_COPY.creatorMark}
              </Badge>
            )}
          </Group>
        </li>
      ))}
    </Stack>
  );
}
