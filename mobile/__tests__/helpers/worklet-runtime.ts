/** What the worklets Babel plugin attaches to a workletized function. */
type Worklet = ((...args: never[]) => unknown) & {
  __closure?: Record<string, unknown> | unknown[];
  __initData?: { code: string };
};

/**
 * Runs a worklet the way the UI runtime does: from the code string the worklets plugin generated, evaluated in global
 * scope with only its captured closure, instead of the module function Jest calls. Catches a worklet that reads a
 * variable it did not capture (a ReferenceError that aborts the app on a device but passes as plain JS).
 */
export function runOnWorkletRuntime<A extends unknown[], R>(
  worklet: (...args: A) => R,
  ...args: A
): R {
  const { __initData, __closure } = worklet as unknown as Worklet;
  if (!__initData) throw new Error(`${worklet.name} is not a worklet (no 'worklet' directive?)`);
  // The Function constructor compiles in global scope, so the module's own bindings are out of reach, as on the UI
  // runtime. Test-only: the code is the plugin's output for our own source.
  const fn = new Function(`return ${__initData.code}`)() as (...a: A) => R;
  return fn.apply({ __closure }, args);
}
