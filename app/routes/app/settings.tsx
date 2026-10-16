import { requireUser } from '@server/guard';
import { redirect } from 'react-router';
import type { Route } from './+types/settings';

// STUB(S1): diisi irisan S1 halaman Pengaturan; hapus dari tes app-stubs saat terisi

export function meta() {
  return [{ title: 'Pengaturan — Simple PM' }];
}

// Until S1 builds the page, settings is the existing profile page (no default export: redirect-only).
export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return redirect('/profile');
}
