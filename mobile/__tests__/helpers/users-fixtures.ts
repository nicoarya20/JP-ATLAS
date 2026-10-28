// The Admin console's Users answers (`server/api/admin.users*.ts`) and a stub that keeps them as the server would: a
// decision takes the sign-up off the pending list, a role change or a (de)activation shows up on the next read.
// test-only
import type { AdminUserStatsWire, AdminUserWire } from '@/data/users.admin.wire';

import type { AuthReply, AuthRoutes } from './auth-server';

export const adminUser = (over: Partial<AdminUserWire> = {}): AdminUserWire => ({
  id: 'u-sari',
  name: 'Sari Wulandari',
  email: 'sari@kantor.id',
  image: null,
  role: 'member',
  banned: false,
  approvalStatus: 'pending',
  // 9:41 AM in Jakarta.
  createdAt: '2026-10-06T02:41:00.000Z',
  ...over,
});

/** Two sign-ups waiting, oldest first. */
export const SIGN_UPS = (): AdminUserWire[] => [
  adminUser(),
  adminUser({
    id: 'u-budi',
    name: 'Budi Santoso',
    email: 'budi@kantor.id',
    createdAt: '2026-10-06T03:05:00.000Z',
  }),
];

/** Approved accounts by name: me (Admin), a Super-admin, another Admin, two Members (one deactivated). */
export const ACCOUNTS = (): AdminUserWire[] =>
  [
    ['u-ayu', 'Ayu Lestari', 'super-admin', false],
    ['u-dewi', 'Dewi Kusuma', 'admin', false],
    ['u-dodi', 'Dodi Hartono', 'member', true],
    ['u-nico', 'Nico Arya', 'admin', false],
    ['u-rina', 'Rina Wulandari', 'member', false],
  ].map(([id, name, role, banned]) =>
    adminUser({
      id: id as string,
      name: name as string,
      email: `${(name as string).split(' ')[0]?.toLowerCase()}@kantor.id`,
      role: role as string,
      banned: banned as boolean,
      approvalStatus: 'approved',
    }),
  );

export const usersStats = (over: Partial<AdminUserStatsWire> = {}): AdminUserStatsWire => ({
  total: 7,
  admins: 2,
  superAdmins: 1,
  banned: 1,
  pending: 2,
  verified: 7,
  new7d: 2,
  active24h: 3,
  ...over,
});

/** The query of a Users request, as a record. */
export const usersQuery = (url: string) => Object.fromEntries(new URL(url).searchParams);

export type AdminWrite = { url: string; body: unknown };

/**
 * Routes for the Users screen over one shared state: lists, stats and the writes (each recorded in `writes`). A write
 * answers `refuse` when one is given, as the server's `{ error, code }`.
 */
export function usersServer(opts: { pending?: AdminUserWire[]; accounts?: AdminUserWire[] } = {}) {
  const state = { pending: opts.pending ?? SIGN_UPS(), accounts: opts.accounts ?? ACCOUNTS() };
  const writes: AdminWrite[] = [];
  let refuse: AuthReply | null = null;
  const list = (url: string): AuthReply => {
    const q = usersQuery(url);
    const all = q.approval === 'pending' ? state.pending : state.accounts;
    const found = q.search
      ? all.filter((u) => u.name.toLowerCase().includes(q.search?.toLowerCase() ?? ''))
      : all;
    const page = Number(q.page);
    const limit = Number(q.limit);
    const users = found.slice((page - 1) * limit, page * limit);
    return { body: { users, total: found.length, page, limit } };
  };
  const decide = (url: string, init?: RequestInit): AuthReply => {
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : null;
    writes.push({ url, body });
    if (refuse) return refuse;
    const [, id, action] = /\/api\/admin\/users\/([^/]+)\/(\w+)$/.exec(url) ?? [];
    const next = body as { role?: string };
    if (action === 'approve' || action === 'reject') {
      state.pending = state.pending.filter((u) => u.id !== id);
    }
    state.accounts = state.accounts.map((u) => {
      if (u.id !== id) return u;
      if (action === 'role') return { ...u, role: next.role ?? u.role };
      if (action === 'ban') return { ...u, banned: true };
      if (action === 'unban') return { ...u, banned: false };
      return u;
    });
    return { body: { ok: true } };
  };
  const routes: AuthRoutes = {
    '/api/admin/users/stats': () => ({
      body: usersStats({
        pending: state.pending.length,
        banned: state.accounts.filter((u) => u.banned).length,
      }),
    }),
    '/api/admin/users?': list,
    '/api/admin/users/': decide,
  };
  return {
    routes,
    writes,
    /** From now on every write is refused with this answer. */
    refuseWith: (reply: AuthReply) => {
      refuse = reply;
    },
  };
}
