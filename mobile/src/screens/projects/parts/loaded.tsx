// One server read of a project screen in its three states: loading, failed (the server's message and "Try again"),
// or its content. Each part asks for its own data, so a slow or failed part never blanks the rest of the screen.
import { type ReactNode, useEffect } from 'react';

import { FailedState, LoadingState } from '@/components/state/section-state';
import type { Resource } from '@/data/resource';

type LoadedProps<T> = {
  res: Resource<T>;
  /** `<testID>-loading` / `<testID>-failed`. */
  testID: string;
  /** Drawn once the data is in (also while a refresh is out). */
  children: (data: T) => ReactNode;
};

/** The part's content once its resource has data; loading or failed until then. */
export function Loaded<T>({ res, testID, children }: LoadedProps<T>) {
  const state = res.useSnapshot();
  useEffect(() => {
    void res.ensure();
  }, [res]);
  if (state.data !== null) return <>{children(state.data)}</>;
  if (state.phase === 'failed') {
    return (
      <FailedState
        testID={`${testID}-failed`}
        message={state.error?.message}
        onRetry={() => void res.reload()}
      />
    );
  }
  return <LoadingState testID={`${testID}-loading`} />;
}
