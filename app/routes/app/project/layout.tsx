import { requireUser } from '@server/guard';
import { Outlet } from 'react-router';
import type { Route } from './+types/layout';

// STUB(S1): diisi irisan S1 kerangka detail proyek (judul + tab); hapus dari tes app-stubs saat terisi

export function meta() {
  return [{ title: 'Proyek — Simple PM' }];
}

// Children guard themselves too: loaders run in parallel, so this guard alone would not protect them.
export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Pass-through layout for /app/projects/:projectId until S1 adds the header and tabs. */
export default function ProjectLayoutStub() {
  return <Outlet />;
}
