import { Button, Group, Progress, Stack, Text } from '@mantine/core';
import type { AskAnswer, Widget } from '@server/home/home.dto';
import { useState } from 'react';
import { HomeSection, type Retry } from './HomeSection';
import { HOME_COPY } from './home.copy';

function Answer({ answer }: { answer: AskAnswer }) {
  return (
    <Stack gap="xs" aria-live="polite">
      <Text size="sm">{answer.answer}</Text>
      {answer.bars.map((b) => (
        <Group key={b.label} gap="sm" wrap="nowrap">
          <Text size="sm" truncate style={{ flex: '0 0 7.5rem', minWidth: 0 }}>
            {b.label}
          </Text>
          <Progress
            value={b.pct}
            color="ok"
            style={{ flex: 1 }}
            aria-label={`${b.label} ${b.display}`}
          />
          <Text size="sm" fw={600} ta="right" style={{ flex: '0 0 4.5rem' }}>
            {b.display}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

/**
 * "Ask Data": a few fixed questions, answered from the viewer's real project data. There is no
 * free-text box on purpose: nothing behind it could answer an arbitrary question honestly.
 */
export function HomeAskData({ widget, retry }: { widget: Widget<AskAnswer[]>; retry: Retry }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <HomeSection
      title={HOME_COPY.ask.title}
      subtitle={HOME_COPY.ask.subtitle}
      widget={widget}
      retry={retry}
    >
      {(answers) => {
        const shown = answers.find((a) => a.key === picked) ?? answers[0];
        return (
          <>
            <Stack gap="xs" role="group" aria-label={HOME_COPY.ask.list}>
              {answers.map((a) => (
                <Button
                  key={a.key}
                  variant={a.key === shown?.key ? 'light' : 'default'}
                  aria-pressed={a.key === shown?.key}
                  onClick={() => setPicked(a.key)}
                >
                  {a.question}
                </Button>
              ))}
            </Stack>
            {shown && <Answer answer={shown} />}
            <Text size="xs" c="dimmed">
              {HOME_COPY.ask.note}
            </Text>
          </>
        );
      }}
    </HomeSection>
  );
}
