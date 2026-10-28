// The move menu's status pill on its own (the board tests run with reduced motion, so they never see it animate): it
// pops out of the ring's centre, and on close the statuses not picked fold back into it while the picked one swells
// where it is (prototype tasks.css tk-radial-pop, tk-radial-fold, tk-radial-swell).
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { COLUMNS } from '../../src/data/tasks.columns';
import { OPTION_RADIUS } from '../../src/data/tasks.radial';
import { RadialOption } from '../../src/screens/tasks/board/radial-option';

const RIGHT = COLUMNS[1]; // In progress, on the right of the ring
const R = OPTION_RADIUS.one;

type Keyframe = { opacity?: number; transform?: Record<string, number>[] };

/** The keyframes the pill animates with, and where its slot sits. */
async function show(opts: { closing: boolean; lit: boolean }) {
  await render(
    <RadialOption
      column={RIGHT}
      group={false}
      now={false}
      reduced={false}
      onPick={() => {}}
      {...opts}
    />,
    { wrapper: GluestackUIProvider },
  );
  const slot = screen.getByTestId('radial-slot-In progress');
  // Reanimated's jest mock drops the CSS animation from `style` and keeps what was passed on `jestInlineStyle`; the
  // JSON round trip turns the -0 of an axis the pill does not travel on into 0.
  const pill = StyleSheet.flatten(
    screen.getByTestId('radial-pill-In progress').props.jestInlineStyle,
  );
  const keys: { from?: Keyframe; to: Keyframe } = JSON.parse(JSON.stringify(pill.animationName));
  return { slot: StyleSheet.flatten(slot.props.style), keys };
}

test('the slot stays on its point of the ring, where the pill is pressed', async () => {
  const { slot } = await show({ closing: false, lit: false });
  expect(slot.transform).toEqual([{ translateX: R }, { translateY: 0 }]);
});

test('opening, the pill pops out of the ring centre', async () => {
  const { keys } = await show({ closing: false, lit: false });
  expect(keys.from).toEqual({
    opacity: 0,
    transform: [{ translateX: -R }, { translateY: 0 }, { scale: 0.6 }],
  });
  expect(keys.to.transform).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
});

test('closing, a status not picked folds back into the centre', async () => {
  const { keys } = await show({ closing: true, lit: false });
  expect(keys.to).toEqual({
    opacity: 0,
    transform: [{ translateX: -R }, { translateY: 0 }, { scale: 0.6 }],
  });
});

test('closing, the picked status swells away where it is', async () => {
  const { keys } = await show({ closing: true, lit: true });
  expect(keys.to).toEqual({
    opacity: 0,
    transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1.3 }],
  });
});
