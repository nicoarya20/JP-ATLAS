import { requireUser } from '@server/guard';
import { ProjectPhasesTab } from '~/components/projects/ProjectPhasesTab';
import { useProjectOutlet } from '~/components/projects/project-context';
import type { Route } from './+types/phases';

export function meta() {
  return [{ title: 'Tahapan Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Tahapan tab (flow ⑨). */
export default function ProjectPhasesPage() {
  return <ProjectPhasesTab phases={useProjectOutlet().project.phases} />;
}
