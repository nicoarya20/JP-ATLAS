import { Badge, Group, Stack, Tabs, Text, Title } from '@mantine/core';
import { listInvitations } from '@server/account/invitation.admin.query';
import { adminUserStats, listAdminUsers } from '@server/api/admin-users.query';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { INVITATION_LIMIT, InvitationPanel } from '~/components/users/InvitationPanel';
import { PendingApprovalList } from '~/components/users/PendingApprovalList';
import { UserDirectory } from '~/components/users/UserDirectory';
import { useUserActions } from '~/components/users/useUserActions';
import {
  fetchUserStats,
  PENDING_LIMIT,
  type UserListResponse,
  type UserStats,
} from '~/lib/admin-users-api';
import { useApp } from '~/lib/app-context';
import type { InvitationListResponse } from '~/lib/invitations-api';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/users';

export function meta() {
  return [{ title: 'Pengguna — Simple PM' }];
}

const LIMIT = 25;
const TABS = ['pending', 'all', 'invitations'] as const;
type Tab = (typeof TABS)[number];
const parseTab = (v: string | null): Tab => TABS.find((t) => t === v) ?? 'pending';

/** SSR every tab's first page so switching tabs never shows an empty flash. */
export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  const [list, stats, pending, invitations] = await Promise.all([
    listAdminUsers({ page: '1', limit: String(LIMIT) }),
    adminUserStats(),
    listAdminUsers({
      approval: 'pending',
      sort: 'oldest',
      page: '1',
      limit: String(PENDING_LIMIT),
    }),
    listInvitations({ limit: INVITATION_LIMIT }),
  ]);
  return {
    list: toJson<UserListResponse>(list),
    stats: toJson<UserStats>(stats),
    pending: toJson<UserListResponse>(pending),
    invitations: toJson<InvitationListResponse>(invitations),
    loadedAt: Date.now(),
    impersonating: actor.impersonatedBy !== null,
  };
}

/** Switching tab only changes `?tab=`; the data is already in the query cache, so skip the reload. */
export function shouldRevalidate({
  currentUrl,
  nextUrl,
}: {
  currentUrl: URL;
  nextUrl: URL;
}): boolean {
  return currentUrl.pathname !== nextUrl.pathname;
}

export default function AdminUsersPage({ loaderData }: Route.ComponentProps) {
  const { user: me, role: actorRole } = useApp();
  const perms = { actorRole, currentUserId: me.id, impersonating: loaderData.impersonating };
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get('tab'));
  const stats = useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: fetchUserStats,
    initialData: loaderData.stats,
    initialDataUpdatedAt: loaderData.loadedAt,
  });
  const actions = useUserActions({ onDone: () => undefined });
  const pendingCount = stats.data?.pending ?? 0;

  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }}>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={3}>Pengguna</Title>
          <Text size="sm" c="dimmed">
            Setujui pendaftar baru, atur peran, dan undang orang ke aplikasi.
          </Text>
        </div>
      </Group>

      <Tabs
        value={tab}
        onChange={(v) =>
          setParams({ tab: parseTab(v) }, { replace: true, preventScrollReset: true })
        }
      >
        <Tabs.List style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          <Tabs.Tab
            value="pending"
            rightSection={
              pendingCount > 0 ? (
                <Badge size="sm" color="yellow" circle>
                  {pendingCount}
                </Badge>
              ) : null
            }
          >
            Persetujuan
          </Tabs.Tab>
          <Tabs.Tab value="all">Semua pengguna</Tabs.Tab>
          <Tabs.Tab value="invitations">Undangan</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pending" pt="md">
          <PendingApprovalList
            initial={loaderData.pending}
            loadedAt={loaderData.loadedAt}
            perms={perms}
            actions={actions}
          />
        </Tabs.Panel>
        <Tabs.Panel value="all" pt="md">
          <UserDirectory initial={loaderData} perms={perms} />
        </Tabs.Panel>
        <Tabs.Panel value="invitations" pt="md">
          <InvitationPanel
            initial={loaderData.invitations}
            loadedAt={loaderData.loadedAt}
            perms={perms}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
