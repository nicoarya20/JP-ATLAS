import { requireUser } from '@server/guard';
import { ProjectSummary } from '~/components/projects/ProjectSummary';
import { useProjectOutlet } from '~/components/projects/project-context';
import type { Route } from './+types/summary';

export function meta() {
  return [{ title: 'Ringkasan Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Ringkasan tab (flow ⑦). */
export default function ProjectSummaryPage() {
  return <ProjectSummary project={useProjectOutlet().project} />;
}
