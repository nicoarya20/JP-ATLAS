// The Just write ✦ / Fill form switch at the top of New task: the other mode replaces the screen, on the same project.
import { router } from 'expo-router';

import { Seg } from '@/components/form/seg';

import { F } from '../tasks.strings';
import { MODE_NAMES } from '../tasks.strings.added';

/** `value` 0 on Just write, 1 on Fill form; `project` the one picked, carried to the other mode. */
export const ModeSwitch = ({ value, project }: { value: 0 | 1; project?: string }) => (
  <Seg
    items={F.modes}
    names={MODE_NAMES}
    value={value}
    onChange={(i) => {
      if (i === value) return;
      const params = project ? { project } : {};
      router.replace(
        i ? { pathname: '/tasks/new/form', params } : { pathname: '/tasks/new', params },
      );
    }}
    testID="new-mode"
  />
);
