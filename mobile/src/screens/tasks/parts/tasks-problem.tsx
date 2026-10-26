// While a task list is on its way, and when it did not arrive (docs/phase2-pola-data.md §3). Built from the shared
// EmptyState so a list is never blank and never pretends to be empty when it simply failed: a request still out says
// so, a failure says whether it was the network or the server, and offers Try again. Nothing here is a dialect of its
// own — it is the same component the empty states use, with the copy a request needs.
import { CloudOff, Loader } from 'lucide-react-native';
import type { ApiError } from '@/api/errors';
import { EmptyState } from '@/components/state/empty-state';
import { Button, ButtonText } from '@/components/ui/button';

export const PROBLEM = {
  loadingIcon: 'Loading',
  loading: 'Loading tasks…',
  failedIcon: 'Cannot reach the server',
  offline: 'No connection.',
  offlineText: 'Check your connection and try again.',
  failed: "Couldn't load the tasks.",
  retry: 'Try again',
} as const;

/** The list is being fetched and there is nothing to show yet. */
export function TasksLoading() {
  return (
    <EmptyState
      testID="tasks-loading"
      icon={Loader}
      iconLabel={PROBLEM.loadingIcon}
      title={PROBLEM.loading}
    />
  );
}

/**
 * The list could not be loaded. A transport failure (`status: 0`) is the one case where saying
 * "no connection" is true; anything else is the server's answer, and its own sentence is shown
 * rather than a second English copy of it (K5).
 */
export function TasksFailed({ error, onRetry }: { error: ApiError | null; onRetry: () => void }) {
  const offline = error?.isTransport ?? false;
  return (
    <EmptyState
      testID="tasks-failed"
      icon={CloudOff}
      iconLabel={PROBLEM.failedIcon}
      title={offline ? PROBLEM.offline : PROBLEM.failed}
      text={offline ? PROBLEM.offlineText : (error?.message ?? undefined)}
      action={
        <Button onPress={onRetry}>
          <ButtonText>{PROBLEM.retry}</ButtonText>
        </Button>
      }
    />
  );
}
