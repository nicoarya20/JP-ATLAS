import { Button, Group } from '@mantine/core';
import { requireUser } from '@server/guard';
import { FiHome } from 'react-icons/fi';
import { Link } from 'react-router';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { useApp } from '~/lib/app-context';
import type { Route } from './+types/home';

export function meta() {
  return [{ title: 'Beranda — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Empty home until S3 shows the user's own work; points to the two lists that exist. */
export default function AppHome() {
  const { user } = useApp();

  return (
    <PageContainer size="narrow">
      <PageHeader
        title={`Halo, ${user.name || 'pengguna'}`}
        description="Selamat datang di Simple PM."
      />
      <EmptyState
        icon={FiHome}
        title="Beranda Anda masih kosong"
        description="Pekerjaan Anda akan tampil di sini. Untuk sekarang, mulai dari daftar proyek atau daftar tugas."
      />
      <Group justify="center" gap="xs" wrap="wrap">
        <Button component={Link} to="/app/projects" variant="light">
          Lihat proyek
        </Button>
        <Button component={Link} to="/app/tasks" variant="light">
          Lihat tugas
        </Button>
      </Group>
    </PageContainer>
  );
}
