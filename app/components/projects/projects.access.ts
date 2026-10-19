// DUMMY: aturan peran untuk tombol Proyek. Memakai kebijakan asli `canCreateProject`;
// ubah/hapus di aplikasi asli bergantung pada menjadi Pengelola proyek itu (`canManageProject`,
// `canTrashProject`), yang baru bisa dipakai setelah keanggotaan datang dari API.
import { canCreateProject } from '@server/access/project.policy';
import type { Principal } from '@server/access/types';

export type DummyProjectAccess = {
  canCreate: boolean;
  /** Edit, extend the due date, manage people. */
  canManage: boolean;
  /** Move to the Trash; blocked while a super-admin is impersonating (Q9). */
  canDelete: boolean;
};

export function dummyProjectAccess(p: Principal): DummyProjectAccess {
  const canCreate = canCreateProject(p).ok;
  return { canCreate, canManage: canCreate, canDelete: canCreate && !p.impersonating };
}

export const NO_ACCESS: DummyProjectAccess = {
  canCreate: false,
  canManage: false,
  canDelete: false,
};

/** "Nico Arya" → "Nico" when the dummy world knows that first name; otherwise the name as it is. */
export function dummyName(fullName: string, known: readonly string[]): string {
  const first = fullName.trim().split(/\s+/)[0] ?? fullName;
  return known.includes(first) ? first : fullName;
}
