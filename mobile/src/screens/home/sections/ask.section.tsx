import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { HomeData } from '@/data/home.types';

import { S } from '../home.strings';
import { ProjectProgress } from '../parts/project-progress';
import { SectionCard } from '../parts/section-card';

type AskSectionProps = { ask: HomeData['ask']; onAsk: () => void };

/** Ask Data: a question field with Ask, suggested questions to pick, and the sample answer with project progress. */
export function AskSection({ ask, onAsk }: AskSectionProps) {
  const [picked, setPicked] = useState(0);
  return (
    <SectionCard title={S.ask.title} sub={S.ask.sub} icon={Sparkles}>
      <HStack className="items-center gap-2">
        <Box className="min-h-11 flex-1 justify-center rounded-control bg-muted px-3">
          <Text className="text-subhead text-muted-foreground">{S.ask.placeholder}</Text>
        </Box>
        <Button variant="outline" onPress={onAsk}>
          <ButtonText>{S.ask.button}</ButtonText>
        </Button>
      </HStack>
      <HStack className="flex-wrap gap-2">
        {ask.questions.map((q, i) => (
          <Pressable
            key={q}
            accessibilityRole="button"
            accessibilityState={{ selected: i === picked }}
            onPress={() => setPicked(i)}
            className={`min-h-11 justify-center rounded-full px-3 ${i === picked ? 'bg-accent' : 'bg-muted'}`}
          >
            <Text
              className={`text-subhead ${i === picked ? 'text-accent-foreground' : 'text-foreground'}`}
            >
              {q}
            </Text>
          </Pressable>
        ))}
      </HStack>
      <VStack className="gap-3 rounded-control bg-muted p-3">
        <Text className="text-subhead">{ask.answer}</Text>
        {ask.projects.map((p) => (
          <ProjectProgress key={p.name} label={p.name} value={p.pct} onMuted />
        ))}
      </VStack>
    </SectionCard>
  );
}
