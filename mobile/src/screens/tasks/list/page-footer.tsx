// What goes under a server list or a board column: Load more while the server has more pages, the failure of the last
// request (in the server's words, K5) with Try again, or, for a column that has nothing yet, that it is loading.

import { SECTION_STATE } from '@/components/state/section-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { loadMoreTasks, taskListResource } from '@/data/tasks.api';
import type { PageView } from '@/data/tasks.list';

import { S } from '../tasks.strings';

/** Load more, Try again, or a spinner, for one page of tasks; nothing when the list is complete. */
export function PageFooter({ page, testID }: { page: PageView; testID: string }) {
  const busy = page.phase === 'loading';
  if (page.blank && busy) {
    return (
      <VStack testID={`${testID}-loading`} className="items-center py-3">
        <Spinner accessibilityLabel={SECTION_STATE.loading} />
      </VStack>
    );
  }
  const failed = page.phase === 'failed';
  if (!failed && !page.more) return null;
  // A failure with rows on screen retries what failed: the next page, or page one when there is none.
  const retry = () =>
    page.more ? loadMoreTasks(page.params) : taskListResource(page.params).reload();
  return (
    <VStack className="items-stretch gap-2 py-2">
      {failed && page.error && (
        <Text testID={`${testID}-error`} className="text-footnote text-destructive">
          {page.error.message}
        </Text>
      )}
      <Button
        testID={testID}
        variant="outline"
        size="sm"
        isDisabled={busy}
        accessibilityState={{ busy, disabled: busy }}
        onPress={() => void retry()}
      >
        {busy && <ButtonSpinner />}
        <ButtonText>{failed ? SECTION_STATE.retry : S.board.loadMore}</ButtonText>
      </Button>
    </VStack>
  );
}
