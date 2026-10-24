// Grey info card with a bold title and a bullet list (prototype users.parts.jsx InfoBox).
import { View } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/** "After approval", "Rules". */
export function InfoBox({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <VStack className="gap-2 rounded-card bg-muted p-4">
      <Text accessibilityRole="header" className="text-footnote font-semibold">
        {title}
      </Text>
      {items.map((item) => (
        <HStack key={item} className="gap-2">
          <View className="mt-2 h-1 w-1 rounded-full bg-foreground" />
          <Text className="flex-1 text-footnote">{item}</Text>
        </HStack>
      ))}
    </VStack>
  );
}
