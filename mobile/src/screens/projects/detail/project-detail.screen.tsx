// Projects ⑧–⑪ detail (prototype projects.detail.jsx / projects.tabs.jsx): the project in the route param `id`, its
// header and the tab in the param `tab` (overview, tasks, phases, members; `view` = list or board on Tasks). The ⋯
// menu, Extend deadline and the tab actions are a Manager's or Admin's, and none while the project is in Archive.
import { router, useLocalSearchParams } from 'expo-router';
import { FolderX } from 'lucide-react-native';
import { useState } from 'react';

import { ActionMenu } from '@/components/menu/action-menu';
import { DetailPage } from '@/components/screen/detail-page';
import { EmptyState } from '@/components/state/empty-state';
import {
  getProjectHeader,
  getProjectMembers,
  getProjectOverview,
  getProjectPhases,
  getProjectTasks,
} from '@/data/projects';
import { useProjectsState } from '@/data/projects.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { useTasks } from '@/data/tasks.state';

import { DETAIL } from '../projects.strings';
import { DetailHead, type DetailTab, DetailTabs, projectMenu, TABS } from './detail-header';
import { MembersTab } from './members.tab';
import { OverviewTab } from './overview.tab';
import { PhasesTab } from './phases.tab';
import { ProjectPage } from './project-page';
import { TasksBody, TasksTools, type TasksView } from './tasks.tab';

const asTab = (t?: string): DetailTab => TABS.find((x) => x === t) ?? 'overview';

/** The detail of the project in the route. role: who is signed in (K12). */
export function ProjectDetailScreen({ role = SESSION_ROLE }: { role?: Role }) {
  useProjectsState();
  const tasks = useTasks((s) => s);
  const params = useLocalSearchParams<{ id: string; tab?: string; view?: string }>();
  const [search, setSearch] = useState('');
  const h = getProjectHeader(role, params.id);
  if (!h) {
    return (
      <DetailPage title={DETAIL.missingTitle} tabBar testID="project-missing">
        <EmptyState icon={FolderX} title={DETAIL.missingTitle} text={DETAIL.missingText} />
      </DetailPage>
    );
  }
  const tab = asTab(params.tab);
  const view: TasksView = params.view === 'board' ? 'board' : 'list';
  const menu = h.canEdit ? (
    <ActionMenu testID="project-actions" label={DETAIL.actions} items={projectMenu(h.id)} />
  ) : undefined;
  const top = [<DetailHead key="head" h={h} />, <DetailTabs key="tabs" tab={tab} />];
  if (tab === 'tasks') {
    const data = getProjectTasks(role, h.id, view, search, tasks);
    return (
      <ProjectPage testID="screen-project" title={h.name} right={menu} sticky={top.length}>
        {top}
        <TasksTools id={h.id} view={view} search={search} onSearch={setSearch} />
        <TasksBody id={h.id} role={role} data={data} onReset={() => setSearch('')} />
      </ProjectPage>
    );
  }
  return (
    <ProjectPage testID="screen-project" title={h.name} right={menu}>
      {top}
      {tab === 'overview' && (
        <OverviewTab
          o={getProjectOverview(role, h.id, tasks)}
          onPhases={() => router.setParams({ tab: 'phases' })}
        />
      )}
      {tab === 'phases' && <PhasesTab p={getProjectPhases(h.id, h.canEdit)} canEdit={h.canEdit} />}
      {tab === 'members' && (
        <MembersTab id={h.id} m={getProjectMembers(role, h.id)} canEdit={h.canEdit} />
      )}
    </ProjectPage>
  );
}
