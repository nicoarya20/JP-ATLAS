import { Alert, Box, Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { IsoDate } from '@server/metrics/dates';
import { FiAlertCircle } from 'react-icons/fi';
import { WRAP_ANYWHERE } from '~/components/pm/text-wrap';
import { MEMBER_ROLE_LABELS } from '~/components/projects/projects.copy';
import { BackLink } from '~/components/ui/BackLink';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import { PageContainer } from '~/components/ui/PageContainer';
import { type PersonDetail, personErrorMessage, usePerson } from '~/lib/team-person-api';
import { AvailabilityBadge } from './AvailabilityBadge';
import { PersonProfileCard } from './PersonProfileCard';
import { PersonTasksCard } from './PersonTasksCard';
import { SharedProjectsCard } from './SharedProjectsCard';
import { DETAIL_COPY, subtitleOf, TEAM_LIST_PATH } from './team.detail.copy';

type Props = { userId: string; initial: PersonDetail; loadedAt: number; today: IsoDate };

/** One person: back link, name, profile and shared projects side by side, then their open work. */
export function TeamDetailView({ userId, initial, loadedAt, today }: Props) {
  const { data, error, refetch, isFetching } = usePerson(userId, {
    initialData: initial,
    initialDataUpdatedAt: loadedAt,
  });
  const { person, projects } = data;
  const subtitle = subtitleOf(
    projects.map((p) => ({ name: p.name, role: MEMBER_ROLE_LABELS[p.role] })),
  );
  return (
    <PageContainer size="narrow">
      <Box>
        <BackLink fallback={TEAM_LIST_PATH} label={DETAIL_COPY.back} />
      </Box>
      {/*
       * K-1: this is a page title, so it takes the handoff's page size (32 px) like every
       * `PageHeader` page. It cannot BE a `PageHeader`: that component has no room for the
       * avatar beside the name or the leave badge under the subtitle.
       */}
      <Group gap="md" wrap="nowrap" align="center">
        <MemberAvatar name={person.name} size="lg" />
        <Stack gap={4} miw={0}>
          <Title order={1} style={WRAP_ANYWHERE}>
            {person.name}
          </Title>
          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
          <Box>
            <AvailabilityBadge availability={data.availability} />
          </Box>
        </Stack>
      </Group>
      {error && (
        <Alert color="danger" icon={<FiAlertCircle size="1.25em" aria-hidden />} role="alert">
          <Group justify="space-between" gap="xs" wrap="wrap">
            <Text size="sm">{DETAIL_COPY.reloadFailed}</Text>
            <Button variant="default" loading={isFetching} onClick={() => refetch()}>
              {DETAIL_COPY.reload}
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            {personErrorMessage(error)}
          </Text>
        </Alert>
      )}
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <PersonProfileCard detail={data} />
        <SharedProjectsCard projects={projects} />
      </SimpleGrid>
      <PersonTasksCard
        name={person.name}
        tasks={data.tasks}
        tasksVisible={data.tasksVisible}
        load={data.load}
        alsoElsewhere={data.alsoElsewhere}
        projects={projects}
        today={today}
      />
    </PageContainer>
  );
}
