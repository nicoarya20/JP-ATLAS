// A board card's hold gesture (docs/phase1-screens.tasks.md §6): a pan that may only activate after HOLD_MS without
// moving, so a swipe that starts on a card still scrolls the board. Active, it opens the move menu at the finger,
// works out the status the slide points to on the UI thread (telling JS only when it changes), and on lift lets the
// menu decide: move, cancel or stay open. The pan only updates once active, so no "holding" flag is needed.
import { usePanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { aimOf, angleOf, HOLD_MS } from '@/data/tasks.radial';

import type { MoveMenu } from './use-move-menu';

/** The hold-and-slide gesture of card #no (testID `card-<no>`). */
export function useMoveGesture(no: number, m: MoveMenu) {
  const { aim, angle } = m.values;
  const { open, aimTo, finish } = m;
  return usePanGesture({
    testID: `card-${no}`,
    activateAfterLongPress: HOLD_MS,
    onActivate: (e) => {
      aim.set(null);
      scheduleOnRN(open, no, e.absoluteX, e.absoluteY);
    },
    onUpdate: (e) => {
      const aimed = aimOf(e.translationX, e.translationY);
      if (aimed) angle.set(angleOf(e.translationX, e.translationY));
      if (aimed !== aim.get()) {
        aim.set(aimed);
        scheduleOnRN(aimTo, aimed);
      }
    },
    // A tap (never active) also ends here; finish ignores it, as no menu is open.
    onFinalize: (e) => scheduleOnRN(finish, e.canceled),
  });
}
