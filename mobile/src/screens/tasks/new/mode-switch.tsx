// The Just write ✦ / Fill form switch at the top of New task · Fill form.
import { router } from 'expo-router';

import { Seg } from '@/components/form/seg';

import { F } from '../tasks.strings';
import { MODE_NAMES } from '../tasks.strings.added';

/** On Fill form; Just write replaces it. */
export const ModeSwitch = () => (
  <Seg
    items={F.modes}
    names={MODE_NAMES}
    value={1}
    onChange={(i) => i === 0 && router.replace('/tasks/new')}
    testID="new-mode"
  />
);
