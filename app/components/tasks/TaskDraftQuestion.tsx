/** The one question the AI may ask (keputusan #12): which member, or an open question to answer in the story. */
import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import type { TaskDraftQuestion as Question } from '@server/ai/task-draft.types';
import { FiHelpCircle } from 'react-icons/fi';
import { WRAP_ANYWHERE } from '~/components/pm/text-wrap';
import { WRITE_COPY as COPY } from './task-draft.copy';

type Props = {
  question: Question;
  onAnswer: (optionId: string) => void;
  /** Back to the story box with the text kept, to add what the AI asked for. */
  onEditText: () => void;
};

export function TaskDraftQuestion({ question, onAnswer, onEditText }: Props) {
  const options = question.options ?? [];
  return (
    <Alert
      color="warn"
      variant="light"
      title={COPY.questionTitle}
      icon={<FiHelpCircle size="1.25em" aria-hidden />}
    >
      <Stack gap="sm">
        <Text fw={600} style={WRAP_ANYWHERE}>
          {question.text}
        </Text>
        {options.length > 0 ? (
          <Group gap="xs" wrap="wrap">
            {options.map((o) => (
              <Button key={o.id} variant="default" onClick={() => onAnswer(o.id)}>
                {o.label}
              </Button>
            ))}
          </Group>
        ) : (
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{COPY.questionOpenHint}</Text>
            <Button variant="default" onClick={onEditText}>
              {COPY.editBackAnswer}
            </Button>
          </Stack>
        )}
      </Stack>
    </Alert>
  );
}
