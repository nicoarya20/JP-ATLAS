import { Stack, Text, Title } from '@mantine/core';
import { adminUserStats, listAdminUsers } from '@server/api/admin-users.query';
import { requireRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { UserDirectory } from '~/components/users/UserDirectory';
import type { UserListResponse, UserStats } from '~/lib/admin-users-api';
import { useApp } from '~/lib/app-context';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/users';

export function meta() {
  return [{ title: 'Users — Simple PM Dev' }];
}

const LIMIT = 25;

/** SSR the default view so the directory is complete at first paint. */
export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireRole(request, ROLES.SUPER_ADMIN);
  const [list, stats] = await Promise.all([
    listAdminUsers({ page: '1', limit: String(LIMIT) }),
    adminUserStats(),
  ]);
  return {
    list: toJson<UserListResponse>(list),
    stats: toJson<UserStats>(stats),
    loadedAt: Date.now(),
    impersonating: actor.impersonatedBy !== null,
  };
}

export default function UsersPage({ loaderData }: Route.ComponentProps) {
  const { user: me, role: actorRole } = useApp();
  const perms = { actorRole, currentUserId: me.id, impersonating: loaderData.impersonating };
  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }}>
      <div>
        <Title order={3}>Users</Title>
        <Text size="sm" c="dimmed">
          Semua akun: peran, status blokir, persetujuan, aktivitas masuk, dan provider yang tertaut.
          Super-admin diatur lewat env.
        </Text>
      </div>
      <UserDirectory initial={loaderData} perms={perms} />
    </Stack>
  );
}
