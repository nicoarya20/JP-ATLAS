import { Anchor, Group, Stack, Text } from '@mantine/core';
import type { TeamProjectRef } from '@server/team/team.dto';
import { Link } from 'react-router';
import { MEMBER_ROLE_LABELS } from '~/components/projects/projects.copy';
import { SectionCard } from '~/components/ui/SectionCard';
import { DETAIL_COPY, PROJECTS_COPY } from './team.detail.copy';

/** Projects the viewer shares with the person (every live project for an Admin), each with the person's role there. */
export function SharedProjectsCard({ projects }: { projects: readonly TeamProjectRef[] }) {
  return (
    <SectionCard title={PROJECTS_COPY.title}>
      {projects.length === 0 ? (
        <Text c="dimmed">{DETAIL_COPY.noProjects}</Text>
      ) : (
        <Stack
          gap="xs"
          component="ul"
          m={0}
          p={0}
          // Mantine has no `list-style` style prop; `List` would change the markup of the rows.
          style={{ listStyle: 'none' }}
        >
          {projects.map((p) => (
            <Group key={p.id} component="li" justify="space-between" gap="xs" wrap="wrap">
              {/* Truncated, not wrapped: every row in the list keeps the same height (K-5). */}
              <Anchor component={Link} to={`/app/projects/${p.id}`} fw={600} miw={0} truncate>
                {p.name}
              </Anchor>
              <Text size="sm" c="dimmed">
                {MEMBER_ROLE_LABELS[p.role]}
              </Text>
            </Group>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
