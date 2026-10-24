// Archived item card (prototype archive.list.jsx Item): kind, title, where/by/date, what a project takes along; Restore
// for everyone, Delete forever (sheet, T3) for an Admin.
import { router } from 'expo-router';

import { useNotice } from '@/components/notice/use-notice';
import { SectionCard } from '@/components/screen/detail-page';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ArchiveCard as Card } from '@/data/archive';

import { ARCHIVE } from './archive.strings';

/** One archived item. Restore is a notice only in Phase 1 (docs/phase1-screens.more.md §6). */
export function ArchiveCard({ card, canDelete }: { card: Card; canDelete: boolean }) {
  const notice = useNotice();
  return (
    <SectionCard testID={`archive-${card.key}`}>
      <VStack className="gap-1">
        <Text className="text-footnote uppercase tracking-wide text-muted-foreground">
          {card.kind}
        </Text>
        <Text className="text-headline font-semibold">{card.title}</Text>
        <Text className="text-footnote text-muted-foreground">{card.meta}</Text>
        {card.includes && (
          <Text className="text-footnote text-muted-foreground">
            {ARCHIVE.includes(card.includes)}
          </Text>
        )}
      </VStack>
      <HStack className="flex-wrap justify-end gap-2">
        {canDelete && (
          <Button
            size="sm"
            variant="outline"
            accessibilityLabel={`${ARCHIVE.deleteForever}: ${card.title}`}
            onPress={() => router.push(`/more/archive/${card.key}/delete`)}
          >
            <ButtonText className="text-destructive">{ARCHIVE.deleteForever}</ButtonText>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          accessibilityLabel={`${ARCHIVE.restore}: ${card.title}`}
          onPress={() => notice(ARCHIVE.restored)}
        >
          <ButtonText>{ARCHIVE.restore}</ButtonText>
        </Button>
      </HStack>
    </SectionCard>
  );
}
