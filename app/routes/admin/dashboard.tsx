import { SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { adminUserStats } from '@server/api/admin-users.query';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { AntreanWidget } from '~/components/admin/home/antrean';
import { BERANDA_COPY } from '~/components/admin/home/beranda.content';
import {
  AgendaWidget,
  LateTasksWidget,
  MembersWidget,
  ProjectsWidget,
  RoleChangesWidget,
} from '~/components/admin/home/beranda.widgets';
import { PratinjauAlert } from '~/components/admin/pratinjau/pratinjau';
import { useApp } from '~/lib/app-context';
import { useSession } from '~/lib/auth-client';
import type { Route } from './+types/dashboard';

export function meta() {
  return [{ title: 'Dashboard — Simple PM' }];
}

/** Guarded here too: layout and page loaders run in parallel, so the layout guard alone would not cover this data. */
export async function loader({ request }: Route.LoaderArgs) {
  await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  const { pending } = await adminUserStats();
  return { pending };
}

/**
 * Admin Beranda: the approval queue on real data, plus the five cards P11 AD-15 will fill from
 * `GET /api/admin/overview`. They are shown as previews rather than withheld because an empty
 * screen teaches an Admin that this page is useless (plan §3 ①) — the strip at the top and the
 * badge on each card say which numbers are samples.
 */
export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user: ctxUser } = useApp();
  const { data } = useSession();
  const user = data?.user ?? ctxUser;

  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }}>
      <div>
        <Title order={1}>{BERANDA_COPY.title}</Title>
        <Text size="sm" c="dimmed">
          {BERANDA_COPY.description} Masuk sebagai <b>{user.email}</b>.
        </Text>
      </div>

      <PratinjauAlert owner="AD-14/AD-15">
        Hanya kartu <b>Antrean persetujuan</b> yang berisi data sungguhan. Lima kartu lain bertanda{' '}
        <b>Pratinjau</b> memakai angka contoh supaya bentuk akhir layar ini bisa dinilai lebih dulu;
        isinya datang dari tugas AD-14 dan AD-15.
      </PratinjauAlert>

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
        <AntreanWidget pending={loaderData.pending} />
        <MembersWidget />
        <ProjectsWidget />
        <LateTasksWidget />
        <AgendaWidget />
        <RoleChangesWidget />
      </SimpleGrid>
    </Stack>
  );
}
