import { ActionIcon, Button, Group, Progress, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { FiMic } from 'react-icons/fi';
import { SectionCard } from '~/components/ui/SectionCard';
import { ASK_ITEMS, type AskItem } from './home.dummy';

const NOT_FOUND: AskItem = {
  question: '',
  answer: 'Pertanyaan ini belum bisa dijawab. Coba salah satu pertanyaan contoh di atas.',
  bars: [],
};

/** "Ask Data": canned questions with canned answers until the real assistant exists. */
export function HomeAskData() {
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState<AskItem | null>(ASK_ITEMS[0] ?? null);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setAnswer(ASK_ITEMS.find((i) => i.question.toLowerCase() === q.toLowerCase()) ?? NOT_FOUND);
  };

  return (
    <SectionCard title="Ask Data" subtitle="Tanya apa saja tentang proyek">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <Group gap="xs" wrap="nowrap" align="flex-end">
          <TextInput
            style={{ flex: 1, minWidth: 0 }}
            placeholder="Ketik atau ucapkan pertanyaan..."
            aria-label="Pertanyaan tentang proyek"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            rightSection={
              <ActionIcon
                variant="subtle"
                aria-label="Ucapkan pertanyaan"
                onClick={() =>
                  notifications.show({
                    message: 'Input suara belum tersedia. Ketik pertanyaannya dulu.',
                  })
                }
              >
                <FiMic size="1.25em" />
              </ActionIcon>
            }
          />
          <Button type="submit" disabled={text.trim() === ''}>
            Tanya
          </Button>
        </Group>
      </form>
      <Stack gap="xs">
        {ASK_ITEMS.map((i) => (
          <Button
            key={i.question}
            variant={answer?.question === i.question ? 'light' : 'default'}
            onClick={() => {
              setText(i.question);
              ask(i.question);
            }}
          >
            {i.question}
          </Button>
        ))}
      </Stack>
      {answer && (
        <Stack gap="xs" aria-live="polite">
          <Text size="sm">{answer.answer}</Text>
          {answer.bars.map((b) => (
            <Group key={b.label} gap="sm" wrap="nowrap">
              <Text size="sm" w={130} style={{ flexShrink: 0 }}>
                {b.label}
              </Text>
              <Progress
                value={b.pct}
                color="ok"
                style={{ flex: 1 }}
                aria-label={`${b.label} ${b.pct}%`}
              />
              <Text size="sm" fw={600} w={40} ta="right">{`${b.pct}%`}</Text>
            </Group>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
