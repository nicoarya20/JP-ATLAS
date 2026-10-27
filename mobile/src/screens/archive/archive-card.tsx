// Archived item card: kind, title, where and when it was deleted, what a project takes along, and
// how long it can still be restored. Restore and Delete forever are drawn from the item's own
// `can{}` — enabled, shown disabled with the server's reason, or not drawn at all.
import { router } from 'expo-router';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { SectionCard } from '@/components/screen/detail-page';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ArchiveCard as Card } from '@/data/archive';
import { restoreCard } from '@/data/archive';

import { ARCHIVE } from './archive.strings';

/** What the server said came back, as a sentence (B-21). */
const restoredText = (card: Card, answer: { tasks?: number; number?: number }): string => {
  if (card.kind === 'project' && answer.tasks !== undefined) {
    return ARCHIVE.restoredProject(answer.tasks);
  }
  if (card.kind === 'task' && answer.number !== undefined) {
    return ARCHIVE.restoredTask(answer.number);
  }
  return ARCHIVE.restored;
};

/** One archived item. */
export function ArchiveCard({ card }: { card: Card }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    setBusy(true);
    try {
      notice(restoredText(card, await restoreCard(card.key)));
    } catch (e) {
      // The server's own sentence, as it came (K5): a restore can be refused for a reason the
      // button could not know yet — the retention ran out, or the project went to the Trash too.
      notice(ARCHIVE.restoreFailed(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SectionCard testID={`archive-${card.key}`}>
      <VStack className="gap-1">
        <Text className="text-footnote uppercase tracking-wide text-muted-foreground">
          {card.kindLabel}
        </Text>
        <Text className="text-headline font-semibold">{card.title}</Text>
        <Text className="text-footnote text-muted-foreground">{card.meta}</Text>
        {card.includes && (
          <Text className="text-footnote text-muted-foreground">
            {ARCHIVE.includes(card.includes)}
          </Text>
        )}
        <Text className="text-footnote text-muted-foreground">{card.retention}</Text>
        {card.blocked && <Text className="text-footnote text-warning">{card.blocked}</Text>}
      </VStack>
      {card.restoreReason && (
        <Text className="text-footnote text-muted-foreground">{card.restoreReason}</Text>
      )}
      <HStack className="flex-wrap justify-end gap-2">
        {card.purge !== 'hidden' && (
          <Button
            size="sm"
            variant="outline"
            isDisabled={card.purge === 'disabled' || busy}
            accessibilityLabel={`${ARCHIVE.deleteForever}: ${card.title}`}
            accessibilityState={{ disabled: card.purge === 'disabled' || busy }}
            onPress={() => router.push(`/more/archive/${card.key}/delete`)}
          >
            <ButtonText className="text-destructive">{ARCHIVE.deleteForever}</ButtonText>
          </Button>
        )}
        {card.restore !== 'hidden' && (
          <Button
            size="sm"
            variant="outline"
            isDisabled={card.restore === 'disabled' || busy}
            accessibilityLabel={`${ARCHIVE.restore}: ${card.title}`}
            accessibilityState={{ busy, disabled: card.restore === 'disabled' || busy }}
            onPress={() => void restore()}
          >
            {busy && <ButtonSpinner />}
            <ButtonText>{ARCHIVE.restore}</ButtonText>
          </Button>
        )}
      </HStack>
    </SectionCard>
  );
}
