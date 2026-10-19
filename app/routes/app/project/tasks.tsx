import { requireUser } from '@server/guard';
import { ProjectTasksTab } from '~/components/projects/ProjectTasksTab';
import { useProjectOutlet } from '~/components/projects/project-context';
import type { Route } from './+types/tasks';

export function meta() {
  return [{ title: 'Tugas Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Tugas tab (flow ⑧). */
export default function ProjectTasksPage() {
  return <ProjectTasksTab projectName={useProjectOutlet().project.name} />;
}
