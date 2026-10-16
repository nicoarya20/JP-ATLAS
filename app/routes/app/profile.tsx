import { requireUser } from '@server/guard';
import { redirect } from 'react-router';
import type { Route } from './+types/profile';

/**
 * /profile merged into /app/settings (S1-15). The route stays so old links and bookmarks keep
 * working; it never renders (no default export, so no meta). Anonymous visitors go to /login first.
 */
export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return redirect('/app/settings');
}
