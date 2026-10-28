// Project card of the list (prototype projects.list.jsx ProjectCard): name and status, Lead, the server's condition and
// its reason, progress and due date. Tap opens the project. No member avatars: the list item has no members (P-1).
import { StatusPill } from '@/components/status/status-pill';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProjectCard as Card } from '@/data/projects.list';
import { CONDITION } from '@/screens/home/home.strings';
import { ConditionPill } from '@/screens/home/parts/condition-pill';

import { Bar } from '../parts/display';
import { LIST } from '../projects.strings';
import { ADDED } from '../projects.strings.added';

/** "Atlas, Active, Lead: Nico Pratama, At risk, 1 tugas penting terlambat, Progress 70%, Due Oct 31": read once. */
const spoken = (c: Card) =>
  [
    c.name,
    c.status,
    LIST.lead(c.lead),
    c.condition && CONDITION[c.condition],
    c.note,
    ADDED.progress(c.percent),
    LIST.due(c.due),
  ]
    .filter(Boolean)
    .join(', ');

/** One project; onOpen gets its id. */
export function ProjectCard({ card, onOpen }: { card: Card; onOpen: (id: string) => void }) {
  return (
    <Pressable
      testID={`project-card-${card.id}`}
      accessibilityRole="button"
      accessibilityLabel={spoken(card)}
      onPress={() => onOpen(card.id)}
      className="gap-3 rounded-card bg-card p-4 data-[active=true]:bg-muted"
    >
      <HStack className="items-start justify-between gap-2">
        <Text className="flex-1 text-headline font-semibold">{card.name}</Text>
        <HStack className="flex-wrap justify-end gap-2">
          <StatusPill status={card.status} />
          <ConditionPill condition={card.condition} />
        </HStack>
      </HStack>
      <VStack className="gap-2">
        <Text className="text-subhead text-muted-foreground">{LIST.lead(card.lead)}</Text>
        {card.note && <Text className="text-subhead font-semibold">{card.note}</Text>}
        <Bar value={card.progress} label={LIST.progress(card.name)} percent={card.percent} />
        <Text className="text-subhead text-muted-foreground">{LIST.due(card.due)}</Text>
      </VStack>
    </Pressable>
  );
}
