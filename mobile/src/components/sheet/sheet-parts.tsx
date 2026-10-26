// The pieces both sheet bodies share (prototype kit Sheet): the X at the top left with the title and sub line, and the
// stacked actions at the bottom.
import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export const SHEET_FRAME = { close: 'Close' } as const;

type SheetHeadProps = { title?: string; sub?: string; onClose: () => void };

/** X to close, then the title (a header for screen readers) and its sub line. */
export function SheetHead({ title, sub, onClose }: SheetHeadProps) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={SHEET_FRAME.close}
        onPress={onClose}
        className="-ml-2 h-11 w-11 items-center justify-center rounded-full data-[active=true]:bg-muted"
      >
        <Icon as={X} size="xl" className="text-foreground" />
      </Pressable>
      {(title || sub) && (
        <VStack className="gap-1">
          {title && (
            <Text accessibilityRole="header" className="text-section font-semibold">
              {title}
            </Text>
          )}
          {sub && <Text className="text-subhead text-muted-foreground">{sub}</Text>}
        </VStack>
      )}
    </>
  );
}

/** Buttons stacked at the bottom, main action first. */
export function SheetActions({ children }: { children?: ReactNode }) {
  return children ? <VStack className="gap-2">{children}</VStack> : null;
}
