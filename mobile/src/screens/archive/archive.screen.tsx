// Archive ① list and ② empty: the server's Trash. The kind chips are its `counts` and the filter is
// its `?kind`, so a chip counts every row of that kind and not the ones that happen to be loaded.
import { Archive } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { Chips } from '@/components/form/chips';
import { DetailPage } from '@/components/screen/detail-page';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { ARCHIVE_FILTERS, getArchive } from '@/data/archive';
import { trashList } from '@/data/archive.api';

import { ARCHIVE, ARCHIVE_EMPTY } from './archive.strings';
import { ArchiveCard } from './archive-card';

/** The Archive. */
export function ArchiveScreen() {
  const [pick, setPick] = useState(0);
  const filter = ARCHIVE_FILTERS[pick]?.[0] ?? 'all';
  const list = trashList(filter);
  const state = list.use();
  // Idempotent by rule 1: `ensure()` fetches only what is not fresh, so every mount may ask.
  useEffect(() => {
    void list.ensure();
  }, [list]);
  const d = getArchive(filter);
  const body = () => {
    if (state.phase === 'failed' && !d) {
      return (
        <FailedState
          testID="archive-failed"
          message={state.error?.message}
          onRetry={() => void list.reload()}
        />
      );
    }
    if (!d) return <LoadingState testID="archive-loading" />;
    // The chips count every kind, so an empty page under a chip is "none of this kind" while an
    // empty Archive is all four chips at zero.
    const anything = d.chips.some((chip) => !chip.endsWith(' 0'));
    if (!anything) {
      return (
        <EmptyState
          testID="archive-empty"
          icon={Archive}
          iconLabel={ARCHIVE_EMPTY.icon}
          title={ARCHIVE_EMPTY.title}
          text={ARCHIVE_EMPTY.text}
        />
      );
    }
    return (
      <>
        <Chips items={d.chips} value={pick} onChange={setPick} label={ARCHIVE.filter} />
        <VStack className="gap-4">
          <Text className="text-footnote font-semibold">{d.count}</Text>
          {d.cards.map((c) => (
            <ArchiveCard key={c.key} card={c} />
          ))}
          {!d.cards.length && <NoMatch title={ARCHIVE.noKind} onReset={() => setPick(0)} />}
          {d.hasMore && (
            <Button
              testID="archive-more"
              variant="outline"
              isDisabled={state.phase === 'loading'}
              accessibilityLabel={ARCHIVE.moreLabel(d.cards.length, d.total)}
              accessibilityState={{ busy: state.phase === 'loading' }}
              onPress={() => void list.more()}
            >
              {state.phase === 'loading' && <ButtonSpinner />}
              <ButtonText>{ARCHIVE.more}</ButtonText>
            </Button>
          )}
        </VStack>
      </>
    );
  };
  return (
    <DetailPage testID="screen-archive" title={ARCHIVE.title} tabBar>
      <Text className="text-subhead text-muted-foreground">{ARCHIVE.intro}</Text>
      {body()}
    </DetailPage>
  );
}
