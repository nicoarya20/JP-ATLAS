import { Sparkles } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { HomeData } from '@/data/home.types';

import { S } from '../home.strings';
import { SectionCard } from '../parts/section-card';

/** Daily Briefing: rule-built lines about today, then when it was built. */
export function BriefingSection({ briefing }: { briefing: HomeData['briefing'] }) {
  return (
    <SectionCard title={S.briefing.title} sub={S.briefing.sub} icon={Sparkles}>
      <VStack className="gap-2">
        {briefing.lines.map((line) => (
          <Text key={line} className="text-body">
            {line}
          </Text>
        ))}
      </VStack>
      <Text className="text-footnote text-muted-foreground">{briefing.meta}</Text>
    </SectionCard>
  );
}
