import { requireUser } from '@server/guard';
import { FiUsers } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/team';

export function meta() {
  return [{ title: 'Tim — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Menu page waiting for its dummy data; the nav link already works. */
export default function TeamPage() {
  return (
    <PageContainer>
      <PageHeader title="Tim" description="Anggota tim dan beban kerjanya." />
      <EmptyState
        icon={FiUsers}
        title="Halaman ini sedang disiapkan"
        description="Data contoh untuk menu ini menyusul."
      />
    </PageContainer>
  );
}
