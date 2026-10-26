// The tab bar's surface (docs/phase1-navigation.md §4.3): Liquid Glass where iOS 26 has it, a semi-opaque token surface
// elsewhere, solid under Reduce Transparency, and nearly solid while the More panel is open over the dim.
import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { GlassSurface } from '../../src/components/tab-bar/glass-surface';

// Whether the device has Liquid Glass, per test; GlassView is a native view, so a plain one stands in.
let mockGlass = false;
jest.mock('expo-glass-effect', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    GlassView: (props: object) => <MockView {...props} />,
    isLiquidGlassAvailable: () => mockGlass,
    isGlassEffectAPIAvailable: () => mockGlass,
  };
});

let reduceTransparency: jest.SpyInstance;
beforeEach(() => {
  reduceTransparency = jest
    .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
    .mockResolvedValue(false);
});
afterEach(() => {
  mockGlass = false;
  jest.restoreAllMocks();
});

async function draw(props: { open?: boolean; hidden?: boolean } = {}) {
  await render(<GlassSurface radius={29} testID="surface" {...props} />);
}
const tint = () =>
  screen.queryByTestId('glass-tint', { includeHiddenElements: true })?.props.className;
const glass = () => screen.queryByTestId('glass-view', { includeHiddenElements: true });
const glassStyle = () => glass()?.props.glassEffectStyle;

describe('glass surface', () => {
  it('without Liquid Glass, is a 60% surface at rest and 88% with the panel open', async () => {
    await draw();
    expect(glass()).toBeNull();
    expect(tint()).toBe('bg-card/60');

    await draw({ open: true });
    expect(tint()).toBe('bg-card/88');
  });

  it('with Liquid Glass, is the glass itself, tinted only with the panel open', async () => {
    mockGlass = true;
    await draw();
    expect(glassStyle()).toEqual({ style: 'regular', animate: true });
    expect(tint()).toBeUndefined();

    await draw({ open: true });
    expect(tint()).toBe('bg-card/88');
  });

  it('turns its glass off before it folds away (GlassView must not sit under a fading parent)', async () => {
    mockGlass = true;
    await draw({ hidden: true });

    expect(glassStyle()).toEqual({ style: 'none', animate: true });
  });

  it('is solid, without glass, when the system asks to reduce transparency', async () => {
    mockGlass = true;
    reduceTransparency.mockResolvedValue(true);
    await draw();

    expect(glass()).toBeNull();
    expect(tint()).toBe('bg-card');
  });

  it('follows Reduce Transparency switched while the app runs', async () => {
    let changed: ((on: boolean) => void) | undefined;
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_name, handler) => {
      changed = handler as (on: boolean) => void;
      return { remove: jest.fn() } as unknown as ReturnType<
        typeof AccessibilityInfo.addEventListener
      >;
    });
    mockGlass = true;
    await draw();
    expect(glass()).not.toBeNull();

    await act(() => changed?.(true));

    expect(glass()).toBeNull();
    expect(tint()).toBe('bg-card');
  });

  it('clips its content to the shared radius', async () => {
    await draw();

    expect(screen.getByTestId('surface')).toHaveStyle({ borderRadius: 29 });
  });
});
