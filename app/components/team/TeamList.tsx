/** Cards of the loaded people, "Menampilkan n dari total" and "Tampilkan lebih banyak" for the next server page. */
import { Button, Stack, Text } from '@mantine/core';
import type { TeamPerson } from '@server/team/team.dto';
import type { ReactNode } from 'react';
import { TeamPersonCard } from './TeamPersonCard';
import { TEAM_COPY } from './team.copy';

type Props = {
  people: TeamPerson[];
  total: number;
  /** Shown instead of the cards when `people` is empty (`TeamEmpty`). */
  empty: ReactNode;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
};

export function TeamList({ people, total, empty, hasMore, loadingMore, onMore }: Props) {
  if (people.length === 0) return <>{empty}</>;
  return (
    <Stack gap="md">
      <Stack
        component="ul"
        gap="xs"
        aria-label={TEAM_COPY.listLabel}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {people.map((person) => (
          <li key={person.id}>
            <TeamPersonCard person={person} />
          </li>
        ))}
      </Stack>
      <Stack gap="xs" align="center">
        <Text size="sm" c="dimmed">
          {TEAM_COPY.shown(people.length, total)}
        </Text>
        {hasMore && (
          <Button variant="default" onClick={onMore} loading={loadingMore}>
            {TEAM_COPY.more}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
