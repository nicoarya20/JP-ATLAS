import { requireUser } from '@server/guard';
import { FiBell } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/inbox';

export function meta() {
  return [{ title: 'Inbox — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Menu page waiting for its dummy data; the nav link already works. */
export default function InboxPage() {
  return (
    <PageContainer>
      <PageHeader title="Inbox" description="Notifikasi dan permintaan untuk Anda." />
      <EmptyState
        icon={FiBell}
        title="Halaman ini sedang disiapkan"
        description="Data contoh untuk menu ini menyusul."
      />
    </PageContainer>
  );
}
