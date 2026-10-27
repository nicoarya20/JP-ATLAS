// Description and "Chat & history" of the detail (prototype tasks.detail.jsx TaskDetail, Log): the text or "No
// description yet.", then the timeline — comments and activity in one stream, newest first as the server pages it,
// with Load more for the older ones.

import { View } from 'react-native';
import { AvatarStack } from '@/components/avatar/avatar-stack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import type { TaskDetailTask } from '@/data/tasks.api.detail';
import type { TaskHistoryLine } from '@/data/tasks.api.timeline';

import { Act, Sec } from '../parts/task-parts';
import { S } from '../tasks.strings';
import { spoken } from '../tasks.strings.added';

/** Description section. */
export function DetailDescription({ task }: { task: TaskDetailTask }) {
  return (
    <Sec title={S.detail.description}>
      <Text
        className={`text-subhead ${task.hasDescription ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {task.description}
      </Text>
    </Sec>
  );
}

type DetailHistoryProps = {
  history: readonly TaskHistoryLine[];
  /** The server has older entries than the ones loaded. */
  hasMore: boolean;
  onMore: () => void;
};

/** History section. */
export function DetailHistory({ history, hasMore, onMore }: DetailHistoryProps) {
  return (
    <Sec title={S.detail.history}>
      {history.map((e) => (
        // One stop per line; its text names the person the avatar shows.
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
      {hasMore && <Act testID="task-history-more" kind="link" label={S.more} onPress={onMore} />}
    </Sec>
  );
}
