/** The story box of "Tulis saja ✦" (Tugas ⑤): a large text area, its counter, the voice button (soon) and Susun. */
import { Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { TASK_DRAFT_TEXT_MAX } from '@server/ai/task-draft.limits';
import { FiMic } from 'react-icons/fi';
import { storyLength } from './task-draft';
import { WRITE_COPY as COPY } from './task-draft.copy';

const REASON_ID = 'task-write-reason';
const COUNTER_ID = 'task-write-counter';

type Props = {
  text: string;
  onText: (text: string) => void;
  /** Why Susun cannot run yet (empty, too long, no project), or null when it can. */
  blocked: string | null;
  loading: boolean;
  /** True once a first answer was shown: the button then reads "Susun ulang". */
  again: boolean;
  onCompose: () => void;
};

export function TaskWriteBox({ text, onText, blocked, loading, again, onCompose }: Props) {
  const used = storyLength(text);
  const over = used > TASK_DRAFT_TEXT_MAX;
  return (
    <Stack gap="xs">
      <Textarea
        label={COPY.boxLabel}
        description={COPY.boxHint}
        placeholder={COPY.boxExample}
        value={text}
        onChange={(e) => onText(e.currentTarget.value)}
        autosize
        minRows={6}
        maxRows={16}
        disabled={loading}
        error={over ? COPY.tooLong(TASK_DRAFT_TEXT_MAX) : undefined}
        aria-describedby={COUNTER_ID}
      />
      <Text id={COUNTER_ID} size="xs" c={over ? 'danger' : 'dimmed'} ta="right" aria-live="polite">
        {COPY.counter(used, TASK_DRAFT_TEXT_MAX)}
      </Text>
      <Group justify="space-between" gap="xs" wrap="wrap">
        {/* Voice input is a later slice; the button is here so the layout matches the wireframe. */}
        <Button
          variant="default"
          disabled
          leftSection={<FiMic size="1.25em" aria-hidden />}
          rightSection={
            <Text span size="xs" c="dimmed">
              {COPY.voiceSoon}
            </Text>
          }
        >
          {COPY.voice}
        </Button>
        <Button
          onClick={onCompose}
          loading={loading}
          disabled={blocked !== null}
          aria-describedby={blocked ? REASON_ID : undefined}
        >
          {again ? COPY.composeAgain : COPY.compose}
        </Button>
      </Group>
      {blocked && !loading && (
        <Text id={REASON_ID} size="sm" c="dimmed" ta="right">
          {blocked}
        </Text>
      )}
      {loading && (
        <Text size="sm" c="dimmed" ta="right" role="status">
          {COPY.composing}
        </Text>
      )}
    </Stack>
  );
}
