/** "Ceritakan proyeknya": one Textarea + "Susun draf", with the counter and disabled/rate states CLAUDE.md requires. */
import { Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { PROJECT_DRAFT_TEXT_MAX } from '@server/ai/project-draft.limits';
import { useState } from 'react';
import { STORY_COPY as COPY } from './story-create.copy';

type Props = {
  loading: boolean;
  /** Seconds left on the shared rate limit (0 = not limited); ticks down from the caller. */
  rateLimitedFor: number;
  onSubmit: (text: string) => void;
  onBack: () => void;
};

export function StoryForm({ loading, rateLimitedFor, onSubmit, onBack }: Props) {
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const disabledReason = !trimmed
    ? null // empty: disabled with no extra reason, the label already implies it
    : rateLimitedFor > 0
      ? COPY.rateLimited(rateLimitedFor)
      : null;

  return (
    <Stack gap="md">
      <Textarea
        label={COPY.textLabel}
        placeholder={COPY.textPlaceholder}
        autosize
        minRows={4}
        maxLength={PROJECT_DRAFT_TEXT_MAX}
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        description={COPY.textHint(text.length)}
      />
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={onBack} disabled={loading}>
          {COPY.back}
        </Button>
        <Button
          onClick={() => onSubmit(trimmed)}
          loading={loading}
          disabled={!trimmed || rateLimitedFor > 0}
          title={disabledReason ?? undefined}
        >
          {loading ? COPY.composing : COPY.submit}
        </Button>
      </Group>
      {disabledReason && (
        <Text size="sm" c="dimmed" ta="right">
          {disabledReason}
        </Text>
      )}
    </Stack>
  );
}
