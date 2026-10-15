import { Button, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { adminUserStats } from '@server/api/admin-users.query';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { FiClock } from 'react-icons/fi';
import { Link } from 'react-router';
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

const nf = new Intl.NumberFormat('id-ID');

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user: ctxUser } = useApp();
  const { data } = useSession();
  const user = data?.user ?? ctxUser;
  const { pending } = loaderData;

  return (
    <Stack p={{ base: 'sm', md: 'md' }}>
      <Title order={2}>Dashboard</Title>
      <Text>
        Masuk sebagai <b>{user.email}</b>
      </Text>
      <Paper withBorder radius="md" p="md" maw={520}>
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon
              variant="light"
              color={pending > 0 ? 'yellow' : 'gray'}
              size="xl"
              radius="md"
            >
              <FiClock size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600}>
                {pending > 0
                  ? `${nf.format(pending)} menunggu persetujuan`
                  : 'Tidak ada yang menunggu persetujuan'}
              </Text>
              <Text size="sm" c="dimmed">
                {pending > 0
                  ? 'Orang yang baru mendaftar belum bisa memakai aplikasi sampai kamu menyetujuinya.'
                  : 'Pendaftar baru akan muncul di sini.'}
              </Text>
            </div>
          </Group>
          <Button
            component={Link}
            to="/dashboard/users?tab=pending"
            variant={pending > 0 ? 'filled' : 'light'}
          >
            {pending > 0 ? 'Tinjau sekarang' : 'Buka halaman Pengguna'}
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
