// Title row of a tappable task card (prototype tasks.list.jsx CardTitle): the title wraps, a chevron says it opens.
import { ChevronRight } from 'lucide-react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/** Card title with its chevron. */
export function CardTitle({ children }: { children: string }) {
  return (
    <HStack className="items-start gap-2">
      <Text className="min-w-0 flex-1 text-headline font-semibold text-foreground">{children}</Text>
      <Icon as={ChevronRight} size="md" className="mt-0.5 text-muted-foreground" />
    </HStack>
  );
}
