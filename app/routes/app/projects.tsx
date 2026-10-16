import { requireUser } from '@server/guard';
import { FiFolder } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/projects';

// STUB(S1): diisi irisan S1 daftar proyek; hapus dari tes app-stubs saat terisi

export function meta() {
  return [{ title: 'Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Placeholder page until the S1 slice fills it in. */
export default function ProjectsStub() {
  return (
    <PageContainer>
      <PageHeader title="Proyek" description="Semua proyek yang Anda ikuti ada di sini." />
      <EmptyState
        icon={FiFolder}
        title="Fitur ini sedang disiapkan"
        description="Halaman ini akan segera bisa dipakai."
      />
    </PageContainer>
  );
}
