// Back next to the danger confirm of the Cancel event sheet (prototype events.sheets.jsx Pair).
import { router } from 'expo-router';

import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';

import { Two } from '../parts/event-parts';

type SheetPairProps = {
  back: string;
  primary: string;
  ok?: boolean;
  /** The confirm is running: it spins, and neither button takes a second press. */
  busy?: boolean;
  onPress: () => void;
};

/** Back closes the sheet; the confirm is danger, disabled until ok. */
export function SheetPair({ back, primary, ok = true, busy = false, onPress }: SheetPairProps) {
  return (
    <Two>
      <Button variant="outline" isDisabled={busy} onPress={() => router.back()}>
        <ButtonText>{back}</ButtonText>
      </Button>
      <Button
        testID="sheet-confirm"
        variant="destructive"
        isDisabled={!ok || busy}
        accessibilityState={{ busy, disabled: !ok || busy }}
        onPress={onPress}
      >
        {busy && <ButtonSpinner />}
        <ButtonText>{primary}</ButtonText>
      </Button>
    </Two>
  );
}
