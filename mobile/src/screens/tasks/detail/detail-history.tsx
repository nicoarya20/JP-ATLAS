// Description and "Chat & history" of the detail (prototype tasks.detail.jsx TaskDetail, Log): the text or "No
// description yet.", then the timeline from the server, newest first: each line with the avatar of whoever it was, and
// when. Load more brings older lines; a timeline that failed says so with Try again, under a task that did load.
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';

import { AvatarStack } from '@/components/avatar/avatar-stack';
import { useNotice } from '@/components/notice/use-notice';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { loadMoreTimeline, taskTimelineResource } from '@/data/tasks.detail.api';
import type { TaskDetailWire } from '@/data/tasks.detail.wire';
import { historyLines } from '@/data/tasks.history';

import { Act, Sec } from '../parts/task-parts';
import { S } from '../tasks.strings';
import { spoken } from '../tasks.strings.added';

/** Description section. */
export function DetailDescription({ text }: { text: string | null }) {
  return (
    <Sec title={S.detail.description}>
      <Text className={`text-subhead ${text ? 'text-foreground' : 'text-muted-foreground'}`}>
        {text ?? S.detail.noDescription}
      </Text>
    </Sec>
  );
}

function LoadMore({ no }: { no: number }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const press = async () => {
    setBusy(true);
    const state = await loadMoreTimeline(no);
    setBusy(false);
    if (state.phase === 'failed' && state.error) notice(state.error.message);
  };
  return <Act testID="history-more" label={S.detail.loadMore} loading={busy} onPress={press} />;
}

/** History section of task #no. */
export function DetailHistory({ task }: { task: TaskDetailWire }) {
  const res = taskTimelineResource(task.number);
  const state = res.use();
  const page = state.data;
  let body: ReactNode;
  if (!page) {
    body =
      state.phase === 'failed' ? (
        <FailedState
          testID="history-failed"
          message={state.error?.message}
          onRetry={() => void res.reload()}
        />
      ) : (
        <LoadingState testID="history-loading" />
      );
  } else {
    const lines = historyLines(page.items, task);
    body = (
      <>
        {!lines.length && (
          <Text className="text-footnote text-muted-foreground">{S.detail.noHistory}</Text>
        )}
        {lines.map((e) => (
          // One stop per line; its text starts with the person the avatar shows.
          <HStack
            key={e.id}
            accessible
            accessibilityLabel={spoken(e.text, e.when)}
            className="items-center gap-3"
          >
            {e.who ? (
              <AvatarStack names={[e.who]} />
            ) : (
              <View className="h-7 w-7 rounded-full bg-muted" />
            )}
            <Text className="min-w-0 flex-1 text-footnote text-foreground">{e.text}</Text>
            <Text className="text-footnote text-muted-foreground">{e.when}</Text>
          </HStack>
        ))}
        {page.nextCursor && <LoadMore no={task.number} />}
      </>
    );
  }
  return <Sec title={S.detail.history}>{body}</Sec>;
}
