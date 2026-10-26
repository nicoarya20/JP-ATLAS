import { renderHook } from '@testing-library/react-native';

import { useBubble } from '../../src/components/tab-bar/use-bubble';

type Fn = ((...args: never[]) => unknown) & {
  __closure?: Record<string, unknown> | unknown[];
  __initData?: { code: string; location?: string };
};

/** Our own worklets (from src/) that `worklet` reaches, itself included, through the closures the plugin captured. */
function ownWorklets(worklet: Fn, seen = new Set<Fn>()): Fn[] {
  if (seen.has(worklet) || !worklet.__initData) return [];
  seen.add(worklet);
  const nested = Object.values(worklet.__closure ?? {})
    .filter((v): v is Fn => typeof v === 'function')
    .flatMap((fn) => ownWorklets(fn, seen));
  return worklet.__initData.location?.includes('/src/') ? [worklet, ...nested] : nested;
}

/** A function written inside a worklet's body, after the worklet's own `function name(…)`. */
const INLINE_FN = /=>|\bfunction\b[\s\S]*\bfunction\b/;

describe('useBubble gesture worklets', () => {
  // On a device the React Compiler (app.json experiments.reactCompiler, Metro only, not Jest) hoists a callback written
  // inside a worklet, e.g. `JELLY.map(([at, x]) => …)`, out to a plain module function `_temp`. The pan runs on the UI
  // thread, where calling it throws "Tried to synchronously call a Remote Function" and aborts the app.
  it('write no callback inside their bodies', async () => {
    const { result } = await renderHook(() => useBubble({ n: 5, active: 0, onRelease: () => {} }));
    const { config } = result.current.pan as unknown as { config: Record<string, Fn> };
    const worklets = ['onBegin', 'onActivate', 'onUpdate', 'onFinalize'].flatMap((name) =>
      ownWorklets(config[name]),
    );
    // settle, slide, grab, follow, at, posAt, nearest, keyframes…: the walk does reach the helpers.
    expect(worklets.length).toBeGreaterThan(8);
    const inline = worklets
      .map((w) => w.__initData?.code ?? '')
      .filter((code) => INLINE_FN.test(code));
    expect(inline).toEqual([]);
  });
});
