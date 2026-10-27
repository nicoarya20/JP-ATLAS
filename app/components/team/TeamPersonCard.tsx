/** One person as a card: the whole card opens the detail page, "Lihat" is the visible way in. */
import { Anchor, Box, Button, Group, Paper, Stack, Text } from '@mantine/core';
import type { TeamPerson } from '@server/team/team.dto';
import { FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import { teamPersonHref } from '~/lib/team-api';
import '../projects/project-click.css';
import { MEMBER_ROLE_LABELS } from '../projects/projects.copy';
import { AvailabilityBadge } from './AvailabilityBadge';
import { TEAM_COPY } from './team.copy';

/** Class names of `project-click.css`: the card is the click area, the name link stretches over it. */
const CLICK_CARD = 'mk-click-card';
const ROW_LINK = 'mk-row-link';
const ABOVE = 'mk-above';
/** Projects spelled out in the line under the name; the rest become "dan N proyek lain". */
export const PROJECTS_SHOWN = 2;

/** "Anggota · Proyek Atlas", two at most, then "dan N proyek lain". */
export function roleLine(projects: TeamPerson['projects']): string {
  if (projects.length === 0) return TEAM_COPY.noProjects;
  const named = projects
    .slice(0, PROJECTS_SHOWN)
    .map((p) => `${MEMBER_ROLE_LABELS[p.role]} · ${p.name}`)
    .join('; ');
  const rest = projects.length - PROJECTS_SHOWN;
  return rest > 0 ? `${named}, ${TEAM_COPY.moreProjects(rest)}` : named;
}

/** Open-task numbers; nothing at all when the server left `load` out (no placeholder, no zero). */
function LoadBlock({ load }: { load: NonNullable<TeamPerson['load']> }) {
  return (
    <Stack gap={0} flex="0 1 9rem">
      <Text fw={700} size="sm">
        {TEAM_COPY.active(load.active)}
      </Text>
      <Text size="xs" c="dimmed">
        {load.overdue > 0 ? TEAM_COPY.overdue(load.overdue) : TEAM_COPY.noOverdue}
        {load.alsoElsewhere && ` ${TEAM_COPY.elsewhere}`}
      </Text>
    </Stack>
  );
}

export function TeamPersonCard({ person }: { person: TeamPerson }) {
  const href = teamPersonHref(person.id);
  return (
    <Paper withBorder p="sm" className={CLICK_CARD}>
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Group gap="sm" wrap="nowrap" flex="1 1 14rem" miw={0}>
          <MemberAvatar name={person.name} image={person.image} size="lg" />
          {/* Truncated, not wrapped: every card in the list keeps the same height (K-5). */}
          <Stack gap={4} miw={0}>
            <Anchor component={Link} to={href} className={ROW_LINK} fw={700} truncate>
              {person.isSelf ? `${person.name} ${TEAM_COPY.you}` : person.name}
            </Anchor>
            <Text size="xs" c="dimmed" lineClamp={2}>
              {roleLine(person.projects)}
            </Text>
            <Box>
              <AvailabilityBadge availability={person.availability} />
            </Box>
          </Stack>
        </Group>
        {person.load && <LoadBlock load={person.load} />}
        <Button
          component={Link}
          to={href}
          className={ABOVE}
          variant="default"
          aria-label={TEAM_COPY.viewLabel(person.name)}
          rightSection={<FiArrowRight size="1.25em" aria-hidden />}
        >
          {TEAM_COPY.view}
        </Button>
      </Group>
    </Paper>
  );
}
