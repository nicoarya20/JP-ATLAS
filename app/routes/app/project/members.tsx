import { requireUser } from '@server/guard';
import { FiUsers } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/members';

// STUB(S1): diisi irisan S1 anggota proyek; hapus dari tes app-stubs saat terisi

export function meta() {
  return [{ title: 'Anggota Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Placeholder page until the S1 slice fills it in. */
export default function ProjectMembersStub() {
  return (
    <PageContainer>
      <PageHeader title="Anggota Proyek" description="Siapa saja yang ikut dalam proyek ini." />
      <EmptyState
        icon={FiUsers}
        title="Fitur ini sedang disiapkan"
        description="Halaman ini akan segera bisa dipakai."
      />
    </PageContainer>
  );
}
