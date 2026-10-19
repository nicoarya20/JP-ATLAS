import {
  ActionIcon,
  Anchor,
  Badge,
  Breadcrumbs,
  Button,
  Group,
  Menu,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { FiEdit2, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router';
import { ConditionPill } from '~/components/pm/ConditionPill';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { formatCalendarDate } from '~/components/ui/DateText';
import { DETAIL_COPY as C } from './project-detail.copy';
import type { DummyProjectAccess } from './projects.access';
import type { ProjectRecord } from './projects.logic';

type Props = {
  project: ProjectRecord;
  access: DummyProjectAccess;
  onExtend: () => void;
  onDelete: () => void;
};

/** Name, status, condition and why, lead and due date, with the buttons the viewer may use (flow ⑦). */
export function ProjectHeader({ project, access, onExtend, onDelete }: Props) {
  const active = project.status === 'active';
  const showWhy = active && project.condition !== 'on_track';
  return (
    <Stack gap="xs">
      <Breadcrumbs>
        <Anchor component={Link} to="/app/projects" size="sm">
          {C.breadcrumbRoot}
        </Anchor>
        <Text size="sm">{project.name}</Text>
      </Breadcrumbs>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
          <Group gap="xs" wrap="wrap">
            <Title order={3}>{project.name}</Title>
            <StatusBadge status={project.status} />
            {active && <ConditionPill condition={project.condition} />}
          </Group>
          {showWhy && <Text size="sm">{`${C.why}: ${project.conditionNote}`}</Text>}
          <Group gap="md" wrap="wrap">
            <Text size="sm">{`${C.lead}: ${project.lead}`}</Text>
            <Text size="sm">{`${C.due}: ${formatCalendarDate(project.due)}`}</Text>
            {project.extended && <Badge variant="light">{project.extended}</Badge>}
          </Group>
        </Stack>
        <Group gap="xs" wrap="wrap" justify="flex-end">
          {access.canManage && active && (
            <Button variant="default" onClick={onExtend}>
              {C.extend}
            </Button>
          )}
          {(access.canManage || access.canDelete) && (
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="default" aria-label={C.menuLabel}>
                  <FiMoreHorizontal size="1.25em" aria-hidden />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {access.canManage && (
                  <Menu.Item
                    component={Link}
                    to={`/app/projects/${encodeURIComponent(project.id)}/settings`}
                    leftSection={<FiEdit2 size="1.25em" aria-hidden />}
                  >
                    {C.edit}
                  </Menu.Item>
                )}
                {access.canDelete && (
                  <Menu.Item
                    color="danger"
                    leftSection={<FiTrash2 size="1.25em" aria-hidden />}
                    onClick={onDelete}
                  >
                    {C.delete}
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>
    </Stack>
  );
}
