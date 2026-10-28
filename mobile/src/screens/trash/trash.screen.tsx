// Trash ① list and ② empty (prototype archive.list.jsx, map `phase2-map-profile-archive.md` §4) from
// `GET /api/app/trash`: kind chips with the server's counts, how many are shown, the cards and "Load more". The other
// modules' Move to Trash does not mark this list stale, so it is read again each time the screen comes into view.
import { useFocusEffect } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';

import { Chips } from '@/components/form/chips';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import {
  getTrashFilter,
  loadMoreTrash,
  setTrashFilter,
  type TrashData,
  trashKey,
  trashResource,
} from '@/data/trash.api';
import { itemsText, TRASH_FILTERS, trashCard, trashChips } from '@/data/trash.view';
import { TRASH, TRASH_EMPTY } from './trash.strings';
import { TrashCard } from './trash-card';

/** "Load more" while the server has more rows; a failure is reported, the cards stay. */
function LoadMore() {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const press = async () => {
    setBusy(true);
    const state = await loadMoreTrash();
    setBusy(false);
    if (state.phase === 'failed' && state.error) notice(state.error.message);
  };
  return (
    <Button
      testID="trash-more"
      variant="outline"
      isDisabled={busy}
      accessibilityState={{ busy, disabled: busy }}
      onPress={press}
    >
      {busy && <ButtonSpinner />}
      <ButtonText>{TRASH.loadMore}</ButtonText>
    </Button>
  );
}

function TrashList({ data }: { data: TrashData }) {
  // The chip follows the kind asked for at once; the cards of the previous kind stay until its page comes.
  const pick = TRASH_FILTERS.findIndex(([k]) => k === getTrashFilter());
  const everything = data.counts.project + data.counts.task + data.counts.event;
  if (!everything) {
    return (
      <EmptyState
        testID="trash-empty"
        icon={Trash2}
        iconLabel={TRASH_EMPTY.icon}
        title={TRASH_EMPTY.title}
        text={TRASH_EMPTY.text}
      />
    );
  }
  const choose = (i: number) => void setTrashFilter(TRASH_FILTERS[i]?.[0] ?? 'all');
  return (
    <>
      <Chips items={trashChips(data.counts)} value={pick} onChange={choose} label={TRASH.filter} />
      <VStack className="gap-4">
        <Text className="text-footnote font-semibold">{itemsText(data.total)}</Text>
        {data.items.map((item) => {
          const key = trashKey(item);
          return <TrashCard key={key} item={item} card={trashCard(item, key)} />;
        })}
        {!data.items.length && <NoMatch title={TRASH.noKind} onReset={() => choose(0)} />}
        {data.items.length < data.total && <LoadMore />}
      </VStack>
    </>
  );
}

/** The Trash: what the viewer may see of deleted projects, tasks and events. */
export function TrashScreen() {
  const state = trashResource.useSnapshot();
  useFocusEffect(
    useCallback(() => {
      if (trashResource.peek().phase === 'empty') void trashResource.ensure();
      else trashResource.invalidate();
    }, []),
  );
  const data = state.data;
  return (
    <DetailPage testID="screen-trash" title={TRASH.title} tabBar>
      <Text className="text-subhead text-muted-foreground">{TRASH.intro}</Text>
      {data ? (
        <TrashList data={data} />
      ) : state.phase === 'failed' ? (
        <FailedState
          testID="trash-failed"
          message={state.error?.message}
          onRetry={() => void trashResource.reload()}
        />
      ) : (
        <LoadingState testID="trash-loading" />
      )}
    </DetailPage>
  );
}
