import { requireUser } from '@server/guard';
import { FiCheckSquare } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/task-new';

// STUB(S2): diisi irisan S2 form tugas baru; hapus dari tes app-stubs saat terisi

export function meta() {
  return [{ title: 'Tugas Baru — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Placeholder page until the S2 slice fills it in. */
export default function TaskNewStub() {
  return (
    <PageContainer>
      <PageHeader title="Tugas Baru" description="Tambahkan tugas baru ke proyek." />
      <EmptyState
        icon={FiCheckSquare}
        title="Fitur ini sedang disiapkan"
        description="Halaman ini akan segera bisa dipakai."
      />
    </PageContainer>
  );
}
