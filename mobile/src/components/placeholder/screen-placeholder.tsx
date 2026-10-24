import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

type ScreenPlaceholderProps = { title: string };

/** Stand-in for a tab screen that is not ported from the prototype yet (Phase 1). */
export function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  return (
    <Center className="flex-1 gap-2 bg-background px-6">
      <Heading size="2xl" accessibilityRole="header">
        {title}
      </Heading>
      <Text className="text-center text-muted-foreground">This screen arrives in Phase 1.</Text>
    </Center>
  );
}
