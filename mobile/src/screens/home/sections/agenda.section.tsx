import { StatusPill } from '@/components/status/status-pill';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { HomeData } from '@/data/home.types';

import { S } from '../home.strings';
import type { OpenTarget } from '../home.targets';
import { ListRow } from '../parts/list-row';
import { ProjectProgress } from '../parts/project-progress';
import { SectionCard } from '../parts/section-card';
import { EmptyLine, SeeAll } from '../parts/small-parts';

type AgendaSectionProps = { agenda: HomeData['agenda']; onOpen: (target: OpenTarget) => void };

/** Agenda & Projects: my next meeting, then my open projects with lead, due date, progress and status. */
export function AgendaSection({ agenda, onOpen }: AgendaSectionProps) {
  const { next, projects } = agenda;
  return (
    <SectionCard title={S.agenda.title} sub={S.agenda.sub}>
      {next ? (
        <ListRow
          title={next.title}
          sub={S.agenda.eventSub(next)}
          onPress={() => onOpen('events.detail')}
          lead={
            <Box className="h-12 w-12 items-center justify-center rounded-control bg-muted">
              <Text className="text-subhead font-semibold">{next.time}</Text>
            </Box>
          }
        />
      ) : (
        <EmptyLine>{S.agenda.noMeetings}</EmptyLine>
      )}
      <HStack className="items-center justify-between">
        <Text accessibilityRole="header" className="text-subhead font-semibold">
          {S.agenda.myProjects}
        </Text>
        <SeeAll onPress={() => onOpen('projects.list')} />
      </HStack>
      {projects.length === 0 && <EmptyLine>{S.agenda.noProjects}</EmptyLine>}
      {projects.map((p) => (
        <ListRow
          key={p.id}
          title={p.name}
          onPress={() => onOpen('projects.overview')}
          right={<StatusPill status={p.status} />}
          sub={
            <VStack className="gap-1">
              <Text className="text-footnote text-muted-foreground">
                {S.agenda.projectSub(p.lead, p.due)}
              </Text>
              <ProjectProgress value={p.progress} />
            </VStack>
          }
        />
      ))}
    </SectionCard>
  );
}
