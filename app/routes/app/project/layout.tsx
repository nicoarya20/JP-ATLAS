import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { FiFolder } from 'react-icons/fi';
import { Outlet } from 'react-router';
import { ProjectHeader } from '~/components/projects/ProjectHeader';
import { ProjectTabs } from '~/components/projects/ProjectTabs';
import type { ProjectOutlet } from '~/components/projects/project-context';
import { DETAIL_COPY } from '~/components/projects/project-detail.copy';
import type { DummyProjectAccess } from '~/components/projects/projects.access';
import { dummyName, dummyProjectAccess } from '~/components/projects/projects.access';
import { PEOPLE } from '~/components/projects/projects.detail.dummy';
import type { ProjectRecord } from '~/components/projects/projects.logic';
import { useProject } from '~/components/projects/projects.store';
import { useProjectDetailActions } from '~/components/projects/useProjectDetailActions';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/layout';

const KNOWN = PEOPLE.map((p) => p.name);

export function meta() {
  return [{ title: 'Proyek — Simple PM' }];
}

// Children guard themselves too: loaders run in parallel, so this guard alone would not protect them.
export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  return {
    access: dummyProjectAccess(toPrincipal(actor)),
    viewer: dummyName(actor.user.name, KNOWN),
  };
}

function Frame(props: { project: ProjectRecord; access: DummyProjectAccess; viewer: string }) {
  const { project, access, viewer } = props;
  const { extend, remove } = useProjectDetailActions(project, viewer);
  return (
    <PageContainer>
      <ProjectHeader project={project} access={access} onExtend={extend} onDelete={remove} />
      <ProjectTabs projectId={project.id} />
      <Outlet context={{ project, access, viewer } satisfies ProjectOutlet} />
    </PageContainer>
  );
}

/** Header and tabs of /app/projects/:projectId over the in-memory dummy store (flow ⑦-⑩). */
export default function ProjectLayout({ loaderData, params }: Route.ComponentProps) {
  const project = useProject(params.projectId);
  if (!project) {
    return (
      <PageContainer>
        <PageHeader
          title={DETAIL_COPY.notFoundTitle}
          back={{ to: '/app/projects', label: DETAIL_COPY.backToList }}
        />
        <EmptyState
          icon={FiFolder}
          title={DETAIL_COPY.notFoundTitle}
          description={DETAIL_COPY.notFoundBody}
        />
      </PageContainer>
    );
  }
  return <Frame project={project} access={loaderData.access} viewer={loaderData.viewer} />;
}
