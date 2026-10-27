// Projects ⑧–⑪ detail (prototype projects.detail.jsx / projects.tabs.jsx): the project in the route param `id`, its
// header and the tab in the param `tab` (overview, tasks, phases, members; `view` = list on Tasks). What the ⋯ menu,
// Extend deadline and the tab actions offer comes from the project's `can{}`, never from the signed-in role.
//
// A project that does not exist, one in the Trash the caller cannot reach and one belonging to someone else all answer
// the same 404 by design, so "Project not found" is right for all three without telling them apart.
import { router, useLocalSearchParams } from 'expo-router';
import { FolderX } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { ActionMenu } from '@/components/menu/action-menu';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { EmptyState } from '@/components/state/empty-state';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { ensureProjectHeader, reloadProjectHeader, useProjectHeader } from '@/data/projects';

import { DETAIL } from '../projects.strings';
import { DetailHead, type DetailTab, DetailTabs, projectMenu, TABS } from './detail-header';
import { MembersTab } from './members.tab';
import { OverviewTab } from './overview.tab';
import { PhasesTab } from './phases.tab';
import { ProjectPage } from './project-page';
import { ArchivedTasks, TasksBody, TasksTools } from './tasks.tab';

const asTab = (t?: string): DetailTab => TABS.find((x) => x === t) ?? 'overview';

/** The detail of the project in the route. */
export function ProjectDetailScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = params.id;
  const notice = useNotice();
  const [search, setSearch] = useState('');
  const { header, phase, error, notFound } = useProjectHeader(id);
  useEffect(() => {
    void ensureProjectHeader(id);
  }, [id]);
  if (notFound) {
    return (
      <DetailPage title={DETAIL.missingTitle} tabBar testID="project-missing">
        <EmptyState icon={FolderX} title={DETAIL.missingTitle} text={DETAIL.missingText} />
      </DetailPage>
    );
  }
  if (!header) {
    return (
      <DetailPage title={DETAIL.loadingTitle} tabBar testID="project-loading">
        {phase === 'failed' ? (
          // The server's own sentence, as it came (K5).
          <FailedState
            testID="project-failed"
            message={error?.message}
            onRetry={() => void reloadProjectHeader(id)}
          />
        ) : (
          <LoadingState testID="project-header-loading" />
        )}
      </DetailPage>
    );
  }
  const tab = asTab(params.tab);
  const items = projectMenu(header, notice);
  const menu = items.length ? (
    <ActionMenu testID="project-actions" label={DETAIL.actions} items={items} />
  ) : undefined;
  const top = [<DetailHead key="head" h={header} />, <DetailTabs key="tabs" tab={tab} />];
  if (tab === 'tasks') {
    return (
      <ProjectPage testID="screen-project" title={header.name} right={menu} sticky={top.length}>
        {top}
        <TasksTools id={id} search={search} onSearch={setSearch} archived={header.archived} />
        {header.archived ? (
          <ArchivedTasks />
        ) : (
          <TasksBody id={id} search={search} onResetSearch={() => setSearch('')} />
        )}
      </ProjectPage>
    );
  }
  return (
    <ProjectPage testID="screen-project" title={header.name} right={menu}>
      {top}
      {tab === 'overview' && (
        <OverviewTab id={id} onPhases={() => router.setParams({ tab: 'phases' })} />
      )}
      {tab === 'phases' && <PhasesTab id={id} />}
      {tab === 'members' && <MembersTab id={id} project={header.name} />}
    </ProjectPage>
  );
}
