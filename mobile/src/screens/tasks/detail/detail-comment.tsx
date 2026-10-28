// The comment box pinned under the detail (prototype tasks.detail.jsx Composer): typed, then sent with Send, which spins
// while it saves (UX §2); the comment then heads the history. `can.comment` decides it: hidden when absent, and a code
// shows the reason in its place (E-6).
import { useState } from 'react';

import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { Allowed } from '@/data/tasks.detail';
import { addTaskComment, COMMENT_MAX } from '@/data/tasks.detail.write';

import { Act, Foot } from '../parts/task-parts';
import { S } from '../tasks.strings';
import { useDetailRun } from './use-detail-run';

type CommentFootProps = { allowed: Allowed; no: number; id: string };

/** The detail's foot bar: the comment box, or why there is none. */
export function CommentFoot({ allowed, no, id }: CommentFootProps) {
  const { busy, run } = useDetailRun();
  const [text, setText] = useState('');
  if (allowed.off) {
    return (
      <Foot>
        <Text testID="comment-off" className="flex-1 text-footnote text-muted-foreground">
          {allowed.off}
        </Text>
      </Foot>
    );
  }
  const send = async () => {
    if (await run('comment', () => addTaskComment(no, id, text))) setText('');
  };
  const empty = !text.trim();
  return (
    <Foot>
      <Input className="flex-1">
        <InputField
          testID="comment-text"
          aria-label={S.detail.commentLabel}
          placeholder={S.detail.comment}
          value={text}
          maxLength={COMMENT_MAX}
          onChangeText={setText}
        />
      </Input>
      <Act
        testID="comment-send"
        kind="primary"
        label={S.detail.send}
        disabled={empty}
        hint={empty ? S.detail.commentMissing : undefined}
        loading={!!busy}
        onPress={() => void send()}
      />
    </Foot>
  );
}
