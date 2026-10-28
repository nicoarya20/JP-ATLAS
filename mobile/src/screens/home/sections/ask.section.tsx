import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { HomeData } from '@/data/home.types';

import { S } from '../home.strings';
import { ProjectProgress } from '../parts/project-progress';
import { WidgetCard } from '../parts/widget-card';

/**
 * Ask Data: the three questions the server answers, and the answer to the one that is picked, with
 * the bars it came with. The free-text field and its Ask button are gone: the server has no
 * free-text ask (`server/home/home.ask.ts` answers three fixed questions, no LLM), so a field that
 * looked like one was a promise nothing kept. The questions and the answers are the server's own
 * Indonesian (K5).
 */
export function AskSection({ ask, onRetry }: { ask: HomeData['ask']; onRetry: () => void }) {
  const [picked, setPicked] = useState(0);
  return (
    <WidgetCard
      title={S.ask.title}
      sub={S.ask.sub}
      icon={Sparkles}
      section={ask}
      onRetry={onRetry}
      testID="ask-failed"
    >
      {(answers) => {
        const shown = answers[Math.min(picked, answers.length - 1)];
        return (
          <>
            <HStack className="flex-wrap gap-2">
              {answers.map((a, i) => (
                <Pressable
                  key={a.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: a === shown }}
                  onPress={() => setPicked(i)}
                  className={`min-h-11 justify-center rounded-full px-3 ${a === shown ? 'bg-accent' : 'bg-muted'}`}
                >
                  <Text
                    className={`text-subhead ${a === shown ? 'text-accent-foreground' : 'text-foreground'}`}
                  >
                    {a.question}
                  </Text>
                </Pressable>
              ))}
            </HStack>
            {shown && (
              <VStack className="gap-3 rounded-control bg-muted p-3">
                <Text className="text-subhead">{shown.answer}</Text>
                {shown.bars.map((b) => (
                  <ProjectProgress
                    key={b.label}
                    label={b.label}
                    value={b.pct}
                    display={b.display}
                    onMuted
                  />
                ))}
              </VStack>
            )}
          </>
        );
      }}
    </WidgetCard>
  );
}
