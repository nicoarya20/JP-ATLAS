// Projects ⑧–⑪ detail (prototype projects.detail.jsx / projects.tabs.jsx) from the server: the project in the route
// param `id`, its header with the ⋯ menu and Extend deadline, and the tab in the param `tab` (overview, tasks, phases,
// members). On the Tasks tab the search and List / Kanban row (param `view`) stick under the nav bar; the search is
// sent once typing rests.
import { router, useLocalSearchParams } from 'expo-router';
import { FolderX } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { DetailPage } from '@/components/screen/detail-page';
import { EmptyState } from '@/components/state/empty-state';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { projectResource } from '@/data/projects.api';
import { getProjectHead } from '@/data/projects.view';
import { useSettled } from '@/screens/tasks';

import { DETAIL } from '../projects.strings';
import { DetailHead, type DetailTab, DetailTabs, TABS } from './detail-header';
import { MembersTab } from './members.tab';
import { OverviewTab } from './overview.tab';
import { PhasesTab } from './phases.tab';
import { ExtendButton, ProjectMenu } from './project-menu';
import { ProjectPage } from './project-page';
import { TasksBody, TasksTools, type TasksView } from './tasks.tab';

const asTab = (t?: string): DetailTab => TABS.find((x) => x === t) ?? 'overview';

/** Loading, missing (404: not there, in the Trash or not the viewer's, all alike) or failed. */
function NoProject({ id }: { id: string }) {
  const res = projectResource(id);
  const state = res.useSnapshot();
  const failed = state.phase === 'failed';
  return (
    <DetailPage title={DETAIL.missingTitle} tabBar testID="project-missing">
      {!failed ? (
        <LoadingState testID="project-loading" />
      ) : state.error?.status === 404 ? (
        <EmptyState icon={FolderX} title={DETAIL.missingTitle} text={DETAIL.missingText} />
      ) : (
        <FailedState
          testID="project-failed"
          message={state.error?.message}
          onRetry={() => void res.reload()}
        />
      )}
    </DetailPage>
  );
}

/** The detail of the project in the route. */
export function ProjectDetailScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: string; view?: string }>();
  const id = params.id;
  const [search, setSearch] = useState('');
  const settled = useSettled(search);
  projectResource(id).useSnapshot();
  useEffect(() => {
    void projectResource(id).ensure();
  }, [id]);
  const h = getProjectHead(id);
  if (!h) return <NoProject id={id} />;
  const tab = asTab(params.tab);
  const page = { testID: 'screen-project', title: h.name, right: <ProjectMenu h={h} /> };
  const top = [
    <DetailHead key="head" h={h} extra={h.canExtend ? <ExtendButton id={h.id} /> : undefined} />,
    <DetailTabs key="tabs" tab={tab} />,
  ];
  if (tab === 'tasks') {
    const view: TasksView = params.view === 'board' ? 'board' : 'list';
    return (
      <ProjectPage {...page} sticky={top.length}>
        {top}
        <TasksTools
          id={h.id}
          view={view}
          search={search}
          onSearch={setSearch}
          create={h.can.createTask}
        />
        <TasksBody
          id={h.id}
          view={view}
          search={settled}
          canAdd={h.can.createTask === true}
          onReset={() => setSearch('')}
        />
      </ProjectPage>
    );
  }
  return (
    <ProjectPage {...page}>
      {top}
      {tab === 'overview' && (
        <OverviewTab id={h.id} onPhases={() => router.setParams({ tab: 'phases' })} />
      )}
      {tab === 'phases' && <PhasesTab id={h.id} canEdit={h.can.update === true} />}
      {tab === 'members' && <MembersTab id={h.id} canEdit={h.can.update === true} />}
    </ProjectPage>
  );
}
