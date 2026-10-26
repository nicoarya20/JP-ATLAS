// Description and "Chat & history" of the detail (prototype tasks.detail.jsx TaskDetail, Log): the text or "No
// description yet.", then each history line with the avatar of the person it starts with and when it happened.

import { View } from 'react-native';
import { AvatarStack } from '@/components/avatar/avatar-stack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import type { TaskDetailView } from '@/data/tasks.detail';

import { Sec } from '../parts/task-parts';
import { S } from '../tasks.strings';
import { spoken } from '../tasks.strings.added';

/** Description section. */
export function DetailDescription({ view }: { view: TaskDetailView }) {
  return (
    <Sec title={S.detail.description}>
      <Text
        className={`text-subhead ${view.hasDescription ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {view.description}
      </Text>
    </Sec>
  );
}

/** History section. */
export function DetailHistory({ history }: { history: TaskDetailView['history'] }) {
  return (
    <Sec title={S.detail.history}>
      {history.map((e) => (
        // One stop per line; its text starts with the person the avatar shows.
        <HStack
          key={`${e.text}-${e.when}`}
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
    </Sec>
  );
}
