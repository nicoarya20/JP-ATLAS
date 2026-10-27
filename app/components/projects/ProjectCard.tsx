/** One project as a card (mobile list and grid view), plus the cells the list table shares with it. */
import { Anchor, Button, Group, Stack, Text } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectListItem } from '@server/project/project.dto';
import { FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router';
import { ConditionPill } from '~/components/pm/ConditionPill';
import { ProgressBar } from '~/components/pm/ProgressBar';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { DateText } from '~/components/ui/DateText';
import { AvatarStack } from '~/components/ui/MemberAvatar';
import './project-click.css';
import { HEADER_COPY, LABEL_LEAD, LIST_COPY } from './projects.copy';

/** Class names of `project-click.css`: the row/card is the click area, the name link stretches over it. */
export const CLICK_ROW = 'mk-click-row';
export const CLICK_CARD = 'mk-click-card';
const ROW_LINK = 'mk-row-link';
const ABOVE = 'mk-above';

export const projectHref = (id: string) => `/app/projects/${encodeURIComponent(id)}`;

/** Condition as icon + text + its one-sentence reason; only running projects have one. */
export function ConditionCell({ project }: { project: Pick<ProjectListItem, 'condition'> }) {
  const { condition } = project;
  if (!condition) {
    return (
      <Text size="sm" c="dimmed" title={LIST_COPY.noCondition}>
        —
      </Text>
    );
  }
  return (
    <Stack gap={2} align="flex-start">
      <ConditionPill condition={condition.level} />
      {condition.reason && (
        <Text size="xs" c="dimmed">
          {condition.reason}
        </Text>
      )}
    </Stack>
  );
}

/** Due date with "n hari lagi" / "terlambat n hari"; finished projects are never late. */
export function DueCell({ project, today }: { project: ProjectListItem; today: IsoDate }) {
  if (!project.dueDate) return <Text size="sm">{HEADER_COPY.noDue}</Text>;
  const settled = project.status === 'completed' || project.status === 'canceled';
  return <DateText value={project.dueDate} mode="due" today={today} settled={settled} />;
}

/** The list DTO carries the Lead only (no member list), so the avatar column shows that person. */
export function LeadCell({ project }: { project: ProjectListItem }) {
  if (!project.lead) {
    return (
      <Text size="sm" c="dimmed">
        {HEADER_COPY.noLead}
      </Text>
    );
  }
  return (
    <Group gap="xs" wrap="nowrap" miw={0}>
      <AvatarStack members={[project.lead]} />
      <Text size="sm" truncate>
        {project.lead.name}
      </Text>
    </Group>
  );
}

export function ProjectNameLink({ project }: { project: ProjectListItem }) {
  return (
    <Anchor
      component={Link}
      to={projectHref(project.id)}
      className={ROW_LINK}
      fw={600}
      // Clamped, not wrapped: every card in the list keeps the same height (K-5).
      lineClamp={2}
    >
      {project.name}
    </Anchor>
  );
}

type Props = { project: ProjectListItem; today: IsoDate };

/** Card body: name and status first, then condition, progress and dates, the action last. */
export function ProjectCard({ project, today }: Props) {
  return (
    <Stack gap="sm">
      <Stack gap="xs" miw={0}>
        <ProjectNameLink project={project} />
        <Group gap="xs" wrap="wrap">
          <StatusBadge status={project.status} />
        </Group>
      </Stack>
      <ConditionCell project={project} />
      <ProgressBar done={project.progress.done} total={project.progress.total} />
      <Group gap="xs" wrap="wrap">
        <Text size="sm" c="dimmed">{`${HEADER_COPY.due}:`}</Text>
        <DueCell project={project} today={today} />
      </Group>
      <Group gap="xs" wrap="wrap">
        <Text size="sm" c="dimmed">{`${LABEL_LEAD}:`}</Text>
        <LeadCell project={project} />
      </Group>
      <Button
        component={Link}
        to={projectHref(project.id)}
        className={ABOVE}
        variant="light"
        fullWidth
        rightSection={<FiArrowRight size="1.25em" aria-hidden />}
      >
        {LIST_COPY.open}
      </Button>
    </Stack>
  );
}
