/** Guards for deleting your own account through Better Auth `/delete-user`: Super-admin only, never while sole manager. */
import { APIError } from 'better-auth/api';
import { canAccessDev } from '../permissions';
import { resolveUserRole } from '../roles';
import { getDeleteBlockers } from './delete-precheck';

export const DELETE_FORBIDDEN = {
  code: 'DELETE_ACCOUNT_FORBIDDEN',
  message: 'Hanya Super-admin yang bisa menghapus akunnya sendiri. Minta Admin untuk menghapusnya.',
} as const;
export const SOLE_MANAGER_CODE = 'SOLE_MANAGER';

/** "Tunjuk pengelola lain untuk proyek A, B dulu."; the names are the project names only, never people. */
export function soleManagerMessage(names: readonly string[], total: number): string {
  const shown = names.slice(0, 3).join(', ');
  const more = total > 3 ? ` dan ${total - 3} proyek lain` : '';
  return `Tunjuk pengelola lain untuk proyek ${shown}${more} dulu, lalu hapus akunmu.`;
}

type SessionUser = { id: string; email: string; role?: string | null; emailVerified: boolean };

/** `user.deleteUser.beforeDelete`: throws before anything is deleted, so a refusal has no side effect. */
export async function guardSelfDelete(sessionUser: SessionUser): Promise<void> {
  if (!canAccessDev(await resolveUserRole(sessionUser))) {
    throw new APIError('FORBIDDEN', {
      message: DELETE_FORBIDDEN.message,
      code: DELETE_FORBIDDEN.code,
    });
  }
  const blockers = await getDeleteBlockers(sessionUser.id);
  if (blockers.total > 0) {
    throw new APIError('CONFLICT', {
      message: soleManagerMessage(
        blockers.projects.map((p) => p.name),
        blockers.total,
      ),
      code: SOLE_MANAGER_CODE,
    });
  }
}
