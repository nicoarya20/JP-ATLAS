import { Sparkles } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { HomeData } from '@/data/home.types';

import { S } from '../home.strings';
import { WidgetCard } from '../parts/widget-card';

/** Daily Briefing: the server's rule-built lines (Indonesian, as they came), then when it was built. */
export function BriefingSection({
  briefing,
  onRetry,
}: {
  briefing: HomeData['briefing'];
  onRetry: () => void;
}) {
  return (
    <WidgetCard
      title={S.briefing.title}
      sub={S.briefing.sub}
      icon={Sparkles}
      section={briefing}
      onRetry={onRetry}
      testID="briefing-failed"
    >
      {(data) => (
        <>
          <VStack className="gap-2">
            {data.lines.map((line) => (
              <Text key={line} className="text-body">
                {line}
              </Text>
            ))}
          </VStack>
          <Text className="text-footnote text-muted-foreground">
            {S.briefing.meta(data.updatedLabel)}
          </Text>
        </>
      )}
    </WidgetCard>
  );
}
