import { requireUser } from '@server/guard';
import { ProjectEditTab } from '~/components/projects/ProjectEditTab';
import type { Route } from './+types/settings';

export function meta() {
  return [{ title: 'Ubah Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Ubah proyek: the create form, filled with this project. */
export default function ProjectSettingsPage() {
  return <ProjectEditTab />;
}
