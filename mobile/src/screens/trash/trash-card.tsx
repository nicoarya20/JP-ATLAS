// One Trash row (prototype archive.list.jsx Item): kind, title, where / who / when, what a project takes along and
// how long it stays; Restore and Delete forever as the item's `can{}` allows. A refused control stays, greyed out,
// with the server's reason under it.
import { router } from 'expo-router';
import { useState } from 'react';

import { isApiError } from '@/api/errors';
import { useNotice } from '@/components/notice/use-notice';
import { SectionCard } from '@/components/screen/detail-page';
import { writeError } from '@/components/state/write-error';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type TrashCard as Card, restoredText } from '@/data/trash.view';
import type { TrashItemWire } from '@/data/trash.wire';
import { restoreTrashItem } from '@/data/trash.write';

import { TRASH } from './trash.strings';

const small = 'text-footnote text-muted-foreground';

/** Restore with its spinner; the outcome is a notice, the card leaves the list when the Trash is read again. */
function useRestore(item: TrashItemWire) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const answer = await restoreTrashItem(item);
      notice(restoredText(item, answer.tasks));
    } catch (e) {
      notice(writeError(e));
      if (!isApiError(e)) throw e;
    } finally {
      setBusy(false);
    }
  };
  return { busy, restore };
}

/** The card of `item`, already put in words as `card`. */
export function TrashCard({ card, item }: { card: Card; item: TrashItemWire }) {
  const { busy, restore } = useRestore(item);
  const why = [card.restore?.why, card.purge?.why].filter((w, i, all) => w && all.indexOf(w) === i);
  return (
    <SectionCard testID={`trash-${card.key}`}>
      <VStack className="gap-1">
        <Text className="text-footnote uppercase tracking-wide text-muted-foreground">
          {card.kind}
        </Text>
        <Text className="text-headline font-semibold">{card.title}</Text>
        <Text className={small}>{card.meta}</Text>
        {card.includes && <Text className={small}>{card.includes}</Text>}
        <Text testID="trash-left" className="text-footnote font-semibold text-foreground">
          {card.left}
        </Text>
        {card.blocked && <Text className={small}>{card.blocked}</Text>}
      </VStack>
      {(card.restore || card.purge) && (
        <HStack className="flex-wrap justify-end gap-2">
          {card.purge && (
            <Button
              size="sm"
              variant="outline"
              isDisabled={!card.purge.on || busy}
              accessibilityLabel={`${TRASH.deleteForever}: ${card.title}`}
              onPress={() => router.push(`/more/archive/${card.key}/delete`)}
            >
              <ButtonText className="text-destructive">{TRASH.deleteForever}</ButtonText>
            </Button>
          )}
          {card.restore && (
            <Button
              size="sm"
              variant="outline"
              isDisabled={!card.restore.on || busy}
              accessibilityState={{ busy, disabled: !card.restore.on || busy }}
              accessibilityLabel={`${TRASH.restore}: ${card.title}`}
              onPress={() => void restore()}
            >
              {busy && <ButtonSpinner />}
              <ButtonText>{TRASH.restore}</ButtonText>
            </Button>
          )}
        </HStack>
      )}
      {why.map((w) => (
        <Text key={w} className={small}>
          {w}
        </Text>
      ))}
    </SectionCard>
  );
}
