// Rows of Project settings (prototype tasks.settings.jsx TypeCard, TagRow): a task type with its base category, and a
// tag with its task count. Their links only toast in Phase 1; Delete asks first (T2, UX §1; the prototype toasts at
// once).
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm/confirm-dialog';

import { useNotice } from '@/components/notice/use-notice';
import { Badge, BadgeText } from '@/components/ui/badge';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { DELETE_TAG } from '../tasks.strings.added';
import { P } from '../tasks.strings.more';

type Links = readonly (readonly [label: string, run: () => void])[];

/** Violet text links, each running its action. */
function LinkRow({ links, of }: { links: Links; of: string }) {
  return (
    <HStack className="gap-1">
      {links.map(([label, run]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${of}`}
          onPress={run}
          className="min-h-11 justify-center px-2"
        >
          <Text className="text-footnote font-semibold text-atlas">{label}</Text>
        </Pressable>
      ))}
    </HStack>
  );
}

export function TypeCard({
  name,
  category,
  count,
}: {
  name: string;
  category: string;
  count: string;
}) {
  const notice = useNotice();
  return (
    <VStack className="gap-2 rounded-card bg-card p-4" testID={`type-${name}`}>
      <HStack className="items-center justify-between gap-2">
        <Text className="text-headline font-semibold text-foreground">{name}</Text>
        <Text className="text-footnote text-muted-foreground">{count}</Text>
      </HStack>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={P.category}
        accessibilityValue={{ text: category }}
        onPress={() => notice(P.categories)}
        className="min-h-11 flex-row items-center justify-between rounded-control border border-border bg-card px-3"
      >
        <Text className="text-body text-foreground">{category}</Text>
        <Icon as={ChevronDown} size="md" className="text-muted-foreground" />
      </Pressable>
      <HStack className="items-center justify-between gap-2">
        <Text className="text-footnote text-muted-foreground">{P.category}</Text>
        <LinkRow
          links={[
            [P.rename, () => notice(P.renameType)],
            [P.archive, () => notice(P.archived)],
          ]}
          of={name}
        />
      </HStack>
    </VStack>
  );
}

export function TagRow({ tag, count }: { tag: string; count: string }) {
  const notice = useNotice();
  const [asking, setAsking] = useState(false);
  const links: Links = [
    [P.rename, () => notice(P.renameTag)],
    [P.merge, () => notice(P.mergeTags)],
    [P.delete, () => setAsking(true)],
  ];
  return (
    <HStack
      className="min-h-11 flex-wrap items-center justify-between gap-2 py-2"
      testID={`tag-${tag}`}
    >
      <Badge variant="outline">
        <BadgeText>{tag}</BadgeText>
      </Badge>
      <HStack className="items-center gap-1">
        <Text className="text-footnote text-muted-foreground">{count}</Text>
        <LinkRow links={links} of={tag} />
      </HStack>
      <ConfirmDialog
        open={asking}
        onClose={() => setAsking(false)}
        title={DELETE_TAG.title(tag)}
        message={DELETE_TAG.message}
        confirmLabel={DELETE_TAG.confirm}
        danger
        onConfirm={() => {
          notice(P.deleted);
        }}
        testID="delete-tag-dialog"
      />
    </HStack>
  );
}
