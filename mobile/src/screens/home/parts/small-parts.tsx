import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import { S } from '../home.strings';

/** Small uppercase group label inside a card (Overdue / Today / This week). */
export function GroupLabel({ children }: { children: string }) {
  return (
    <Text className="mt-2 text-footnote uppercase tracking-wide text-muted-foreground">
      {children}
    </Text>
  );
}

/** Violet "See all"-style text button. */
export function SeeAll({ label = S.seeAll, onPress }: { label?: string; onPress: () => void }) {
  return (
    <Button variant="link" size="sm" className="self-start" onPress={onPress}>
      <ButtonText>{label}</ButtonText>
    </Button>
  );
}

/** Muted one-line empty state inside a card. */
export function EmptyLine({ children }: { children: string }) {
  return <Text className="text-subhead text-muted-foreground">{children}</Text>;
}
