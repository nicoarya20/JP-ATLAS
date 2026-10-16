import { requireUser } from '@server/guard';
import { FiTrash2 } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/trash';

export function meta() {
  return [{ title: 'Sampah — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Menu page waiting for its dummy data; the nav link already works. */
export default function TrashPage() {
  return (
    <PageContainer>
      <PageHeader title="Sampah" description="Item terhapus yang masih bisa dipulihkan." />
      <EmptyState
        icon={FiTrash2}
        title="Halaman ini sedang disiapkan"
        description="Data contoh untuk menu ini menyusul."
      />
    </PageContainer>
  );
}
