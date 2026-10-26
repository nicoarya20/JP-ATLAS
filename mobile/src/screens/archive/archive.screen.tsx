// Archive ① list and ② empty (prototype archive.list.jsx): kind chips, the count, the archived cards.
import { Archive } from 'lucide-react-native';
import { useState } from 'react';

import { Chips } from '@/components/form/chips';
import { DetailPage } from '@/components/screen/detail-page';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { ARCHIVE_FILTERS, getArchive } from '@/data/archive';
import { useArchiveEntries } from '@/data/archive.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { ARCHIVE, ARCHIVE_EMPTY } from './archive.strings';
import { ArchiveCard } from './archive-card';

/** The Archive. role: who is signed in (K12). */
export function ArchiveScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const entries = useArchiveEntries();
  const [pick, setPick] = useState(0);
  const filter = ARCHIVE_FILTERS[pick]?.[0] ?? 'ALL';
  const d = getArchive(role, entries, filter);
  return (
    <DetailPage testID="screen-archive" title={ARCHIVE.title} tabBar>
      <Text className="text-subhead text-muted-foreground">{ARCHIVE.intro}</Text>
      {entries.length ? (
        <>
          <Chips items={d.chips} value={pick} onChange={setPick} label={ARCHIVE.filter} />
          <VStack className="gap-4">
            <Text className="text-footnote font-semibold">{d.count}</Text>
            {d.cards.map((c) => (
              <ArchiveCard key={c.key} card={c} canDelete={d.canDelete} />
            ))}
            {!d.cards.length && <NoMatch title={ARCHIVE.noKind} onReset={() => setPick(0)} />}
          </VStack>
        </>
      ) : (
        <EmptyState
          testID="archive-empty"
          icon={Archive}
          iconLabel={ARCHIVE_EMPTY.icon}
          title={ARCHIVE_EMPTY.title}
          text={ARCHIVE_EMPTY.text}
        />
      )}
    </DetailPage>
  );
}
