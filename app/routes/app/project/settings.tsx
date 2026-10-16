import { requireUser } from '@server/guard';
import { FiSettings } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/settings';

// STUB(S1): diisi irisan S1 ubah proyek; hapus dari tes app-stubs saat terisi

export function meta() {
  return [{ title: 'Ubah Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Placeholder page until the S1 slice fills it in. */
export default function ProjectSettingsStub() {
  return (
    <PageContainer>
      <PageHeader title="Ubah Proyek" description="Ubah nama, tanggal, dan status proyek." />
      <EmptyState
        icon={FiSettings}
        title="Fitur ini sedang disiapkan"
        description="Halaman ini akan segera bisa dipakai."
      />
    </PageContainer>
  );
}
