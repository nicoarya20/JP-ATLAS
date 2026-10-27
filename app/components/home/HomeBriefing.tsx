import { Group, Stack, Text } from '@mantine/core';
import type { HomeBriefing as Briefing, Widget } from '@server/home/home.dto';
import { FiStar } from 'react-icons/fi';
import { HomeSection, type Retry } from './HomeSection';
import { HOME_COPY } from './home.copy';

/** Short summary of what needs attention today, written by rules from the viewer's own data (no model). */
export function HomeBriefing({ widget, retry }: { widget: Widget<Briefing>; retry: Retry }) {
  return (
    <HomeSection
      title={HOME_COPY.briefing.title}
      subtitle={HOME_COPY.briefing.subtitle}
      accent="ok"
      widget={widget}
      retry={retry}
    >
      {(b) => (
        <>
          <Stack gap={6}>
            {b.lines.map((line) => (
              <Text key={line}>{line}</Text>
            ))}
          </Stack>
          <Group gap={4} wrap="nowrap" c="dimmed">
            <FiStar size="1.25em" aria-hidden />
            <Text size="xs">{HOME_COPY.briefing.footnote(b.updatedLabel)}</Text>
          </Group>
        </>
      )}
    </HomeSection>
  );
}
