import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

type SectionCardProps = { title: string; sub?: string; icon?: LucideIcon; children: ReactNode };

/** A Home card (prototype kit Section + Head): headline title with an optional violet icon, muted sub line, body. */
export function SectionCard({ title, sub, icon, children }: SectionCardProps) {
  return (
    <Card>
      <VStack>
        <HStack className="items-center gap-2">
          {icon && <Icon as={icon} size="md" className="text-atlas" />}
          <Text accessibilityRole="header" className="text-headline font-semibold">
            {title}
          </Text>
        </HStack>
        {sub && <Text className="text-footnote text-muted-foreground">{sub}</Text>}
      </VStack>
      {children}
    </Card>
  );
}
