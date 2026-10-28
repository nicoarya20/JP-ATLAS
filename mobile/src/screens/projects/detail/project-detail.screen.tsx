// Projects ⑧–⑪ detail (prototype projects.detail.jsx / projects.tabs.jsx) from the server: the project in the route
// param `id`, its header and the tab in the param `tab` (overview, phases, members). The project's Tasks tab is not
// offered until the Tasks module reads the server, so `tab=tasks` opens the Overview (GAP: Projects Tasks tab).
import { router, useLocalSearchParams } from 'expo-router';
import { FolderX } from 'lucide-react-native';
import { useEffect } from 'react';

import { DetailPage } from '@/components/screen/detail-page';
import { EmptyState } from '@/components/state/empty-state';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { projectResource } from '@/data/projects.api';
import { getProjectHead } from '@/data/projects.view';

import { DETAIL } from '../projects.strings';
import { DetailHead, type DetailTab, DetailTabs, TABS } from './detail-header';
import { MembersTab } from './members.tab';
import { OverviewTab } from './overview.tab';
import { PhasesTab } from './phases.tab';
import { ProjectPage } from './project-page';

const asTab = (t?: string): DetailTab => TABS.find((x) => x === t) ?? 'overview';

/** Loading, missing (404: not there, in the Trash or not the viewer's, all alike) or failed. */
function NoProject({ id }: { id: string }) {
  const res = projectResource(id);
  const state = res.use();
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
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = params.id;
  projectResource(id).use();
  useEffect(() => {
    void projectResource(id).ensure();
  }, [id]);
  const h = getProjectHead(id);
  if (!h) return <NoProject id={id} />;
  const tab = asTab(params.tab);
  return (
    <ProjectPage testID="screen-project" title={h.name}>
      <DetailHead h={h} />
      <DetailTabs tab={tab} />
      {tab === 'overview' && (
        <OverviewTab id={h.id} onPhases={() => router.setParams({ tab: 'phases' })} />
      )}
      {tab === 'phases' && <PhasesTab id={h.id} />}
      {tab === 'members' && <MembersTab id={h.id} canEdit={h.can.update === true} />}
    </ProjectPage>
  );
}
