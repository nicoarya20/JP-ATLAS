import { Group, Stack, Text } from '@mantine/core';
import { FiStar } from 'react-icons/fi';
import { SectionCard } from '~/components/ui/SectionCard';
import { BRIEFING } from './home.dummy';

/** Auto-written summary of what needs attention today. */
export function HomeBriefing() {
  return (
    <SectionCard title="Daily Briefing" subtitle="Apa yang perlu saya tahu hari ini?" accent="teal">
      <Stack gap={6}>
        {BRIEFING.lines.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </Stack>
      <Group gap={4} wrap="nowrap" c="dimmed">
        <FiStar size="1.25em" aria-hidden />
        <Text size="xs">{BRIEFING.footnote}</Text>
      </Group>
    </SectionCard>
  );
}
