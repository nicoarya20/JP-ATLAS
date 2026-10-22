/** Comment box of the task detail (S2-13): the draft stays in the box when sending fails. */
import { Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { useState } from 'react';
import { COMMENT_COPY as COPY } from './task-body.copy';
import { sendKeepingDraft } from './task-timeline';
import { useCommentActions } from './useTaskBodyActions';

export function CommentBox({ taskRef }: { taskRef: string }) {
  const { send } = useCommentActions(taskRef);
  const [draft, setDraft] = useState('');
  const tooLong = draft.length > COPY.max;
  const submit = async () => setDraft(await sendKeepingDraft(draft, (text) => send.run(text)));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Stack gap="xs">
        <Textarea
          label={COPY.label}
          placeholder={COPY.placeholder}
          autosize
          minRows={2}
          maxRows={8}
          value={draft}
          error={tooLong ? COPY.counter(draft.length) : undefined}
          onChange={(e) => setDraft(e.currentTarget.value)}
        />
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="xs" c={tooLong ? 'danger' : 'dimmed'}>
            {COPY.counter(draft.length)}
          </Text>
          <Button type="submit" loading={send.loading} disabled={draft.trim() === '' || tooLong}>
            {COPY.submit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
