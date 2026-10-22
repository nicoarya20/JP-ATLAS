/** The ⋯ menu of the project header: edit, condition and delete, each only when the server allows it. */
import { ActionIcon, Menu } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectDetail } from '@server/project/project.dto';
import { FiEdit2, FiMoreHorizontal } from 'react-icons/fi';
import { Link } from 'react-router';
import { ProjectDeleteItem, showsDeleteProject } from '~/components/trash/ProjectDeleteItem';
import { HEADER_COPY } from '../projects.copy';
import { hasOverrideItems, OverrideMenuItems } from './OverrideMenuItems';

type ProjectMenuData = Pick<
  ProjectDetail,
  'id' | 'name' | 'can' | 'taskCounts' | 'status' | 'conditionOverride'
>;

/** True when the menu would hold at least one item, so an empty ⋯ is never drawn. */
export function hasMenu(p: ProjectMenuData): boolean {
  return p.can.update === true || showsDeleteProject(p.can) || hasOverrideItems(p);
}

export function ProjectMenu({ project, today }: { project: ProjectMenuData; today: IsoDate }) {
  if (!hasMenu(project)) return null;
  return (
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
        <OverrideMenuItems project={project} today={today} />
        {showsDeleteProject(project.can) && (
          <ProjectDeleteItem
            target={{ id: project.id, name: project.name, tasks: project.taskCounts.live }}
            today={today}
          />
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
