// Pieces both event sheets share (prototype events.sheets.jsx Pair): Back / Cancel next to the danger confirm, and
// the body for an event id that is not in the store.
import { router } from 'expo-router';

import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Button, ButtonText } from '@/components/ui/button';

import { DETAIL } from '../events.strings';
import { Two } from '../parts/event-parts';

type SheetPairProps = { back: string; primary: string; ok?: boolean; onPress: () => void };

/** Back closes the sheet; every confirm here cancels or archives, so it is danger, disabled until ok. */
export function SheetPair({ back, primary, ok = true, onPress }: SheetPairProps) {
  return (
    <Two>
      <Button variant="outline" onPress={() => router.back()}>
        <ButtonText>{back}</ButtonText>
      </Button>
      <Button variant="destructive" isDisabled={!ok} onPress={onPress}>
        <ButtonText>{primary}</ButtonText>
      </Button>
    </Two>
  );
}

/** Sheet opened for an event that is gone (an old link): says so, closed by its X. */
export const SheetMissing = () => (
  <SheetFrame title={DETAIL.missingTitle} sub={DETAIL.missingText} />
);
