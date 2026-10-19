import { requireUser } from '@server/guard';
import { ProjectMembersTab } from '~/components/projects/ProjectMembersTab';
import { useProjectOutlet } from '~/components/projects/project-context';
import type { Route } from './+types/members';

export function meta() {
  return [{ title: 'Anggota Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Anggota tab (flow ⑩). */
export default function ProjectMembersPage() {
  const { project, access, viewer } = useProjectOutlet();
  return <ProjectMembersTab project={project} canManage={access.canManage} viewer={viewer} />;
}
