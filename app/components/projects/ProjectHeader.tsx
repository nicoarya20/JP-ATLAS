/** Project detail header (⑧): name, status, condition (active only), lead, due date, extend button, ⋯ menu and notes. */
import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectStatus } from '@server/pm/enums';
import type { ProjectDetail } from '@server/project/project.dto';
import type { ReactNode } from 'react';
import { FiArrowLeft, FiClock, FiInfo } from 'react-icons/fi';
import { Link } from 'react-router';
import { ConditionPill } from '~/components/pm/ConditionPill';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { WRAP_ANYWHERE } from '~/components/pm/text-wrap';
import { DateText } from '~/components/ui/DateText';
import { PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import { BANNER_COPY, HEADER_COPY, LABEL_LEAD } from './projects.copy';
import { DeadlineBadge } from './summary/DeadlineBadge';
import { openExtendDeadlineModal } from './summary/ExtendDeadlineModal';
import { canExtendDeadline } from './summary/header-caps';
import { ProjectMenu } from './summary/ProjectMenu';
import { EXTEND_COPY, OVERRIDE_COPY, REASON_LINE_COPY } from './summary/summary.copy';

/** Statuses that get the Q12 note: work is over or paused, yet tasks may still be added. */
const CLOSED_STATUSES: readonly ProjectStatus[] = ['completed', 'canceled', 'on_hold'];

export type ProjectHeaderData = Pick<
  ProjectDetail,
  | 'id'
  | 'name'
  | 'status'
  | 'condition'
  | 'lead'
  | 'dueDate'
  | 'can'
  | 'taskCounts'
  | 'extensionCount'
  | 'conditionOverride'
>;

/** The condition is only meaningful while the project runs; the server already nulls it otherwise. */
export function shownCondition(p: Pick<ProjectDetail, 'status' | 'condition'>) {
  return p.status === 'active' ? p.condition : null;
}

/** Read-only for watchers and non-member PMs (D10): neither may change the project nor add tasks. */
export function isReadOnly(p: Pick<ProjectDetail, 'can'>): boolean {
  return p.can.update !== true && p.can.createTask !== true;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" miw={0}>
      <Text size="sm" c="dimmed" flex="0 0 auto">
        {`${label}:`}
      </Text>
      {children}
    </Group>
  );
}

type Props = { project: ProjectHeaderData; today: IsoDate };

export function ProjectHeader({ project, today }: Props) {
  const condition = shownCondition(project);
  const closed = CLOSED_STATUSES.includes(project.status);
  const settled = project.status === 'completed' || project.status === 'canceled';
  const { dueDate } = project;
  return (
    <Stack gap="sm">
      {/* Always the list, never `navigate(-1)`: from a tab, "back" would otherwise land on the previous tab. */}
      <Button
        component={Link}
        to="/app/projects"
        variant="subtle"
        size="sm"
        px="xs"
        // Mantine has no `align-self` style prop, and aligning the Stack would move every child.
        style={{ alignSelf: 'flex-start' }}
        leftSection={<FiArrowLeft size="1.25em" aria-hidden />}
      >
        {HEADER_COPY.back}
      </Button>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
        <Group gap="sm" wrap="wrap" align="center" miw={0} flex={1}>
          {/* The page title of a detail page: it wraps in full, never truncated (K-5). */}
          <Title order={2} miw={0} style={WRAP_ANYWHERE}>
            {project.name}
          </Title>
          <StatusBadge status={project.status} />
          {condition && <ConditionPill condition={condition.level} />}
        </Group>
        <Group gap="xs" wrap="wrap" justify="flex-end">
          {canExtendDeadline(project) && dueDate && (
            <Button
              variant="light"
              leftSection={<FiClock size="1.25em" aria-hidden />}
              onClick={() =>
                openExtendDeadlineModal({ projectId: project.id, currentDue: dueDate })
              }
            >
              {EXTEND_COPY.open}
            </Button>
          )}
          <ProjectMenu project={project} today={today} />
        </Group>
      </Group>

      {condition?.reason && (
        <Text size="sm" c="dimmed">
          {`${REASON_LINE_COPY.why}: ${condition.reason}`}
          {project.conditionOverride &&
            ` (${OVERRIDE_COPY.badge(project.conditionOverride.setByName)})`}
        </Text>
      )}

      <Group gap="lg" wrap="wrap">
        <Fact label={LABEL_LEAD}>
          <Text size="sm" fw={500} truncate>
            {project.lead?.name ?? HEADER_COPY.noLead}
          </Text>
        </Fact>
        <Fact label={HEADER_COPY.due}>
          {dueDate ? (
            <DateText value={dueDate} mode="due" today={today} settled={settled} />
          ) : (
            <Text size="sm">{HEADER_COPY.noDue}</Text>
          )}
          <DeadlineBadge projectId={project.id} count={project.extensionCount} />
        </Fact>
      </Group>

      {closed && (
        <Alert color="gray" variant="light" icon={<FiInfo size="1.25em" aria-hidden />}>
          {BANNER_COPY.closed(PROJECT_STATUS_LABELS[project.status].label)}
        </Alert>
      )}
      {isReadOnly(project) && (
        <Alert color="blue" variant="light" icon={<FiInfo size="1.25em" aria-hidden />}>
          {BANNER_COPY.readOnly}
        </Alert>
      )}
    </Stack>
  );
}
