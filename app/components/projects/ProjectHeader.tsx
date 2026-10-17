/** Project detail header (⑧): name, status, condition (active only), lead, due date, ⋯ menu and notes. */
import { ActionIcon, Alert, Group, Menu, Stack, Text, Title } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectStatus } from '@server/pm/enums';
import type { ProjectDetail } from '@server/project/project.dto';
import type { ReactNode } from 'react';
import { FiEdit2, FiInfo, FiMoreHorizontal } from 'react-icons/fi';
import { Link } from 'react-router';
import { ConditionPill } from '~/components/pm/ConditionPill';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { ProjectDeleteItem, showsDeleteProject } from '~/components/trash/ProjectDeleteItem';
import { DateText } from '~/components/ui/DateText';
import { PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import { BANNER_COPY, HEADER_COPY, LABEL_LEAD } from './projects.copy';

/** Statuses that get the Q12 note: work is over or paused, yet tasks may still be added. */
const CLOSED_STATUSES: readonly ProjectStatus[] = ['completed', 'canceled', 'on_hold'];

export type ProjectHeaderData = Pick<
  ProjectDetail,
  'id' | 'name' | 'status' | 'condition' | 'lead' | 'dueDate' | 'can' | 'taskCounts'
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
    <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
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
  const canDelete = showsDeleteProject(project.can);
  return (
    <Stack gap="sm">
      {/* nowrap is safe: the only button is one 44px icon and the title itself wraps. */}
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Title order={2} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {project.name}
        </Title>
        {(project.can.update === true || canDelete) && (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={HEADER_COPY.menuLabel}>
                <FiMoreHorizontal size="1.25em" aria-hidden />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {project.can.update === true && (
                <Menu.Item
                  component={Link}
                  to={`/app/projects/${encodeURIComponent(project.id)}/settings`}
                  leftSection={<FiEdit2 size="1.25em" aria-hidden />}
                >
                  {HEADER_COPY.edit}
                </Menu.Item>
              )}
              {canDelete && (
                <ProjectDeleteItem
                  target={{ id: project.id, name: project.name, tasks: project.taskCounts.live }}
                  today={today}
                />
              )}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <Group gap="sm" wrap="wrap">
        <StatusBadge status={project.status} />
        {condition && (
          <Group gap={6} wrap="wrap" style={{ minWidth: 0 }}>
            <ConditionPill condition={condition.level} />
            {condition.reason && (
              <Text size="sm" c="dimmed">
                {condition.reason}
              </Text>
            )}
          </Group>
        )}
      </Group>

      <Group gap="lg" wrap="wrap">
        <Fact label={LABEL_LEAD}>
          <Text size="sm" fw={500} truncate>
            {project.lead?.name ?? HEADER_COPY.noLead}
          </Text>
        </Fact>
        <Fact label={HEADER_COPY.due}>
          {project.dueDate ? (
            <DateText value={project.dueDate} mode="due" today={today} settled={settled} />
          ) : (
            <Text size="sm">{HEADER_COPY.noDue}</Text>
          )}
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
