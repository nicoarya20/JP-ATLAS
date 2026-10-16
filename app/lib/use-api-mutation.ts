/** Hook that wraps one async API write with a `loading` flag and success/failure toasts. */
import { useCallback, useRef, useState } from 'react';
import { notify } from '../components/ui/notify';
import { ApiError, describeApiError } from './http';

export type MutationOptions<V, D> = {
  mutationFn: (vars: V) => Promise<D>;
  /** Toast text on success; omit when the screen already shows the change (list refresh, badge). */
  successMessage?: string | ((data: D, vars: V) => string);
  /** Toast title on failure, naming the action: "Gagal menyimpan". */
  errorTitle: string;
  onSuccess?: (data: D, vars: V) => void | Promise<void>;
  onError?: (error: unknown, vars: V) => void;
};

export type MutationResult<D> = { ok: true; data: D } | { ok: false; error: unknown };

/** Runs the mutation once; never throws, so callers branch on `ok` instead of wrapping try/catch. */
export async function runMutation<V, D>(
  options: MutationOptions<V, D>,
  vars: V,
  setLoading: (loading: boolean) => void,
): Promise<MutationResult<D>> {
  setLoading(true);
  try {
    const data = await options.mutationFn(vars);
    const { successMessage } = options;
    if (successMessage) {
      notify.success(
        typeof successMessage === 'function' ? successMessage(data, vars) : successMessage,
      );
    }
    await options.onSuccess?.(data, vars);
    return { ok: true, data };
  } catch (error) {
    // A 401 already sent the browser to the login page; a red toast on top would only flash.
    if (!(error instanceof ApiError && error.status === 401)) {
      notify.error(options.errorTitle, describeApiError(error));
    }
    options.onError?.(error, vars);
    return { ok: false, error };
  } finally {
    setLoading(false);
  }
}

/**
 * `run(vars)` for a button's onClick/onSubmit and `loading` for its `loading` prop.
 * Mantine disables a loading button, which is what stops a double submit.
 */
export function useApiMutation<V, D>(options: MutationOptions<V, D>) {
  const [loading, setLoading] = useState(false);
  // The latest options are read at call time so inline closures do not change `run`'s identity.
  const latest = useRef(options);
  latest.current = options;
  const run = useCallback((vars: V) => runMutation(latest.current, vars, setLoading), []);
  return { run, loading };
}
