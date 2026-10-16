import { requireUser } from '@server/guard';
import { FiCalendar } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/events';

export function meta() {
  return [{ title: 'Events — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Menu page waiting for its dummy data; the nav link already works. */
export default function EventsPage() {
  return (
    <PageContainer>
      <PageHeader title="Events" description="Jadwal rapat dan acara tim." />
      <EmptyState
        icon={FiCalendar}
        title="Halaman ini sedang disiapkan"
        description="Data contoh untuk menu ini menyusul."
      />
    </PageContainer>
  );
}
