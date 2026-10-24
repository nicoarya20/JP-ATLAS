// "Filter & sort" (prototype kit FilterPanel), the body of a list's filter formSheet route: fields that edit a draft,
// then Reset (back to the list's default) and Apply (the list's query store takes the draft, the sheet closes).
import type { ReactNode } from 'react';

import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';

export const FILTER_SHEET = { title: 'Filter & sort', reset: 'Reset', apply: 'Apply' } as const;

type FilterSheetProps = {
  onReset: () => void;
  onApply: () => void;
  onClose?: () => void;
  /** FilterField groups. */
  children: ReactNode;
};

/** Title, the fields, and Reset / Apply side by side at the bottom. */
export function FilterSheet({ onReset, onApply, onClose, children }: FilterSheetProps) {
  return (
    <SheetFrame
      testID="filter-sheet"
      title={FILTER_SHEET.title}
      onClose={onClose}
      actions={
        <HStack className="gap-2">
          <Button variant="outline" className="flex-1" onPress={onReset}>
            <ButtonText>{FILTER_SHEET.reset}</ButtonText>
          </Button>
          <Button className="flex-1" onPress={onApply}>
            <ButtonText>{FILTER_SHEET.apply}</ButtonText>
          </Button>
        </HStack>
      }
    >
      {children}
    </SheetFrame>
  );
}
