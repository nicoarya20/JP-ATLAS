// Rows of Project settings (prototype tasks.settings.jsx TypeCard, TagRow): a task type with its base category, and a
// tag with its task count. Their links only toast in Phase 1.
import { ChevronDown } from 'lucide-react-native';

import { useNotice } from '@/components/notice/use-notice';
import { Badge, BadgeText } from '@/components/ui/badge';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { P } from '../tasks.strings.more';

type Links = readonly (readonly [label: string, toast: string])[];

/** Violet text links, each showing its toast. */
function LinkRow({ links, of }: { links: Links; of: string }) {
  const notice = useNotice();
  return (
    <HStack className="gap-1">
      {links.map(([label, toast]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${of}`}
          onPress={() => notice(toast)}
          className="min-h-11 justify-center px-2"
        >
          <Text className="text-footnote font-semibold text-atlas">{label}</Text>
        </Pressable>
      ))}
    </HStack>
  );
}

const TYPE_LINKS: Links = [
  [P.rename, P.renameType],
  [P.archive, P.archived],
];
const TAG_LINKS: Links = [
  [P.rename, P.renameTag],
  [P.merge, P.mergeTags],
  [P.delete, P.deleted],
];

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
        <LinkRow links={TYPE_LINKS} of={name} />
      </HStack>
    </VStack>
  );
}

export function TagRow({ tag, count }: { tag: string; count: string }) {
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
        <LinkRow links={TAG_LINKS} of={tag} />
      </HStack>
    </HStack>
  );
}
