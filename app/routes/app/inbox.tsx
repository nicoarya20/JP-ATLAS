import { SegmentedControl } from '@mantine/core';
import { requireUser } from '@server/guard';
import { useState } from 'react';
import { InboxList } from '~/components/inbox/InboxList';
import { LATEST_NEWS, NEEDS_ACTION } from '~/components/inbox/inbox.dummy';
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

type Tab = 'action' | 'news';

/** Inbox with hardcoded dummy data (inbox.dummy.ts): requests to answer, then the latest news. */
export default function InboxPage() {
  const [tab, setTab] = useState<Tab>('action');
  return (
    <PageContainer>
      <PageHeader title="Inbox" description="Semua kabar dan permintaan untuk Anda" />
      <SegmentedControl
        aria-label="Isi Inbox"
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        data={[
          { value: 'action', label: `Perlu Anda tanggapi (${NEEDS_ACTION.length})` },
          { value: 'news', label: 'Kabar terbaru' },
        ]}
        style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
      />
      {tab === 'action' ? (
        <InboxList items={NEEDS_ACTION} emptyTitle="Tidak ada yang perlu Anda tanggapi" />
      ) : (
        <InboxList items={LATEST_NEWS} emptyTitle="Belum ada kabar terbaru" />
      )}
    </PageContainer>
  );
}
