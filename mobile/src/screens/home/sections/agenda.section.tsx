import type { Href } from 'expo-router';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { HomeData } from '@/data/home.types';

import { S } from '../home.strings';
import { projectHref, TARGET_HREF } from '../home.targets';
import { ConditionPill } from '../parts/condition-pill';
import { ListRow } from '../parts/list-row';
import { ProjectProgress } from '../parts/project-progress';
import { SectionCard } from '../parts/section-card';
import { EmptyLine, SeeAll } from '../parts/small-parts';
import { WidgetPart } from '../parts/widget-card';

type AgendaSectionProps = {
  agenda: HomeData['agenda'];
  projects: HomeData['projects'];
  onOpen: (href: Href) => void;
  onRetry: () => void;
};

/**
 * Agenda & Projects: my next meeting, then my projects with their due date, progress and how the
 * server judges them. The meeting's location text and the project lead are hidden (GAP H-7, H-8:
 * neither is on the wire), and the pill is the project's `condition`, not a lifecycle status the
 * home payload never carried.
 *
 * The two halves are separate sections on the wire, so each one can fail on its own.
 */
export function AgendaSection({ agenda, projects, onOpen, onRetry }: AgendaSectionProps) {
  return (
    <SectionCard title={S.agenda.title} sub={S.agenda.sub}>
      <WidgetPart section={agenda} onRetry={onRetry} testID="agenda-failed">
        {(next) =>
          next ? (
            <ListRow
              title={next.title}
              sub={S.agenda.eventSub(next)}
              onPress={() => onOpen(next.href)}
              lead={
                <Box className="h-12 w-12 items-center justify-center rounded-control bg-muted">
                  <Text className="text-subhead font-semibold">{next.time}</Text>
                </Box>
              }
            />
          ) : (
            <EmptyLine>{S.agenda.noMeetings}</EmptyLine>
          )
        }
      </WidgetPart>
      <HStack className="items-center justify-between">
        <Text accessibilityRole="header" className="text-subhead font-semibold">
          {S.agenda.myProjects}
        </Text>
        <SeeAll onPress={() => onOpen(TARGET_HREF['projects.list'])} />
      </HStack>
      <WidgetPart section={projects} onRetry={onRetry} testID="projects-failed">
        {(rows) => (
          <>
            {rows.length === 0 && <EmptyLine>{S.agenda.noProjects}</EmptyLine>}
            {rows.map((p) => (
              <ListRow
                key={p.id}
                title={p.name}
                onPress={() => onOpen(projectHref(p.id))}
                right={<ConditionPill condition={p.condition} />}
                sub={S.agenda.projectSub(p.due)}
                below={
                  <VStack className="gap-1">
                    {/* null is "no tasks yet", which a 0 % bar would quietly turn into a claim. */}
                    {p.progress === null ? (
                      <Text className="text-footnote text-muted-foreground">
                        {S.agenda.noTasksYet}
                      </Text>
                    ) : (
                      <ProjectProgress value={p.progress} />
                    )}
                    {/* Why it needs a look: the server's own sentence, a line of its own (K5). */}
                    {p.reason && (
                      <Text className="text-footnote text-muted-foreground">{p.reason}</Text>
                    )}
                  </VStack>
                }
              />
            ))}
          </>
        )}
      </WidgetPart>
    </SectionCard>
  );
}
