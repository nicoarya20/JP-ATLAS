/**
 * The role × capability matrix shown read-only on /dashboard/permissions ("Peran & izin").
 *
 * Every cell is *computed* by calling the function in `server/permissions.ts` that decides it at
 * request time — nothing here restates its answers. That is the whole point: the moment a rule
 * changes there, this table changes with it, so it can never quietly start lying to an Admin.
 * Adding a capability means pointing `cell` at the function that already answers it.
 */
import {
  canAccessDev,
  canActOnTarget,
  canImpersonate,
  canSetRole,
  homeFor,
  isAdminRole,
  isAssignableRole,
  ROLES,
  type Role,
} from '../permissions';

/** Columns, weakest first, so the table reads as a ladder. */
export const MATRIX_ROLE_ORDER: readonly Role[] = [
  ROLES.MEMBER,
  ROLES.PROJECT_MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
];

const ROLE_COPY: Record<Role, { label: string; description: string }> = {
  [ROLES.MEMBER]: {
    label: 'Member',
    description: 'Orang yang mengerjakan tugas dan ikut proyek.',
  },
  [ROLES.PROJECT_MANAGER]: {
    label: 'Project Manager',
    description: 'Member yang juga boleh mengelola proyek dan jadwalnya.',
  },
  [ROLES.ADMIN]: {
    label: 'Admin',
    description: 'Mengurus akun, proyek, dan setelan kantor.',
  },
  [ROLES.SUPER_ADMIN]: {
    label: 'Super-admin',
    description: 'Pemilik sistem. Hanya dari daftar email SUPER_ADMIN_EMAILS, bukan dari menu.',
  },
};

/**
 * One answer for one role. `granted` is the yes/no answer; it is null when the capability
 * answers with a value instead (a path, for example), which then sits in `note`.
 */
export type MatrixCell = {
  role: Role;
  granted: boolean | null;
  note: string | null;
};

type CapabilityDef = {
  id: string;
  label: string;
  description: string;
  /** The function in `server/permissions.ts` that answers this row, named so a reader can check it. */
  source: string;
  /** Called per role on every request — never memoised, so a changed rule shows up immediately. */
  cell: (role: Role) => Pick<MatrixCell, 'granted' | 'note'>;
};

const yes = (granted: boolean) => ({ granted, note: null });
const value = (note: string) => ({ granted: null, note });

/**
 * Rows of the matrix. Each `cell` is a thin call into `permissions.ts`; the wrapper arrow matters,
 * because calling through the live import (instead of capturing the function here) is what keeps
 * the row honest when that module changes.
 */
export const MATRIX_CAPABILITIES: readonly CapabilityDef[] = [
  {
    id: 'home',
    label: 'Halaman awal setelah masuk',
    description: 'Area yang dibuka aplikasi begitu orang ini berhasil masuk.',
    source: 'homeFor()',
    cell: (role) => value(homeFor(role)),
  },
  {
    id: 'area-admin',
    label: 'Membuka area Admin (/dashboard)',
    description: 'Halaman Pengguna, Proyek, Pengaturan, dan Aktivitas.',
    source: 'isAdminRole()',
    cell: (role) => yes(isAdminRole(role)),
  },
  {
    id: 'area-dev',
    label: 'Membuka area Super-admin (/dev)',
    description: 'Konsol operasional: log, rate limit, retensi, mode pemeliharaan.',
    source: 'canAccessDev()',
    cell: (role) => yes(canAccessDev(role)),
  },
  {
    id: 'set-role',
    label: 'Mengubah peran akun orang lain',
    description: 'Menaikkan atau menurunkan peran dari menu Pengguna.',
    source: 'canSetRole()',
    cell: (role) => yes(canSetRole(role)),
  },
  {
    id: 'act-on-member',
    label: 'Menindak akun Member dan Project Manager',
    description: 'Menyetujui, menolak, memblokir, atau mencabut sesi orang tersebut.',
    source: 'canActOnTarget(peran, member)',
    cell: (role) => yes(canActOnTarget(role, ROLES.MEMBER)),
  },
  {
    id: 'act-on-admin',
    label: 'Menindak akun Admin dan Super-admin',
    description: 'Admin tidak bisa menyentuh Admin lain, termasuk dirinya sendiri.',
    source: 'canActOnTarget(peran, admin)',
    cell: (role) => yes(canActOnTarget(role, ROLES.ADMIN)),
  },
  {
    id: 'impersonate',
    label: 'Masuk sebagai pengguna lain',
    description: 'Melihat aplikasi dari sudut pandang orang lain untuk menelusuri masalah.',
    source: 'canImpersonate()',
    cell: (role) => yes(canImpersonate(role)),
  },
  {
    id: 'assignable',
    label: 'Peran ini bisa diberikan dari menu Pengguna',
    description: 'Peran yang muncul di pilihan peran saat menyetujui atau mengundang orang.',
    source: 'isAssignableRole()',
    cell: (role) => yes(isAssignableRole(role)),
  },
];

export type PermissionsMatrix = {
  /** Where the answers come from, so the panel can say so out loud. */
  source: string;
  roles: Array<{ id: Role; label: string; description: string }>;
  capabilities: Array<{
    id: string;
    label: string;
    description: string;
    source: string;
    cells: MatrixCell[];
  }>;
};

/** Builds the matrix for the read-only panel by asking `permissions.ts` about every role. */
export function buildPermissionsMatrix(): PermissionsMatrix {
  return {
    source: 'server/permissions.ts',
    roles: MATRIX_ROLE_ORDER.map((id) => ({ id, ...ROLE_COPY[id] })),
    capabilities: MATRIX_CAPABILITIES.map(({ id, label, description, source, cell }) => ({
      id,
      label,
      description,
      source,
      cells: MATRIX_ROLE_ORDER.map((role) => ({ role, ...cell(role) })),
    })),
  };
}
