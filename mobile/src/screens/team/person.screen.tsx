// Team ② Person (prototype team.person.jsx): profile facts, the projects I share with them, and their active tasks for
// PM/Admin (or a Member looking at themself).
import { router } from 'expo-router';
import { UserX } from 'lucide-react-native';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { Facts } from '@/components/list/facts';
import { Row, Rows } from '@/components/list/rows';
import { DetailPage, SectionCard } from '@/components/screen/detail-page';
import { EmptyState } from '@/components/state/empty-state';
import { StatusPill } from '@/components/status/status-pill';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { useTasks } from '@/data/tasks.state';
import type { TeamPersonData } from '@/data/team';
import { getTeamPerson } from '@/data/team.person';
import { routeHref } from '@/navigation/route-href';

import { StatusText } from './person-row';
import { PERSON, rowLabel } from './team.strings';

const Heading = ({ title, right }: { title: string; right?: string }) => (
  <HStack className="items-center justify-between gap-2">
    <Text accessibilityRole="header" className="text-section font-semibold">
      {title}
    </Text>
    {right && <Text className="text-footnote text-muted-foreground">{right}</Text>}
  </HStack>
);

/** Active tasks, or why the viewer may not see them. */
function Tasks({ d }: { d: TeamPersonData }) {
  if (!d.tasks) {
    return (
      <SectionCard>
        <Text className="text-subhead">{PERSON.hiddenTasks}</Text>
      </SectionCard>
    );
  }
  const { load, rows, hidden } = d.tasks;
  return (
    <VStack className="gap-2">
      <Heading title={PERSON.tasks} right={PERSON.load(load.active, load.overdue)} />
      {rows.length ? (
        <Rows>
          {rows.map((t) => (
            <Row
              key={t.no}
              title={t.title}
              sub={t.sub}
              accessibilityLabel={rowLabel([t.title, t.pill, t.sub])}
              right={<StatusPill status={t.pill} />}
              onPress={() => router.push(`/tasks/${t.no}`)}
            />
          ))}
        </Rows>
      ) : (
        <Text className="text-subhead text-muted-foreground">{PERSON.noTasks}</Text>
      )}
      {hidden.length > 0 && (
        <Text className="text-footnote text-muted-foreground">
          {PERSON.hiddenProjects(d.person.name, hidden)}
        </Text>
      )}
    </VStack>
  );
}

/** Team member `id` (a person key such as "rina"). */
export function PersonScreen({ id, role = SESSION_ROLE }: { id: string; role?: Role }) {
  const tasks = useTasks((s) => s.tasks);
  const d = getTeamPerson(role, id, { tasks });
  if (!d) {
    return (
      <DetailPage testID="screen-team-person" title={PERSON.title} tabBar>
        <EmptyState icon={UserX} title={PERSON.missingTitle} text={PERSON.missingText} />
      </DetailPage>
    );
  }
  const p = d.person;
  return (
    <DetailPage testID="screen-team-person" title={PERSON.title} tabBar>
      <HStack className="items-center gap-3">
        <PersonAvatar name={p.full} size="xl" />
        <VStack className="min-w-0 flex-1 gap-1">
          <Text accessibilityRole="header" className="text-page font-bold">
            {p.full}
          </Text>
          <StatusText status={d.status} available={d.available} />
        </VStack>
      </HStack>
      <SectionCard>
        <Facts
          facts={[
            [PERSON.facts.job, p.title],
            [PERSON.facts.division, p.division],
            [PERSON.facts.email, p.email],
            [PERSON.facts.role, p.role],
          ]}
        />
      </SectionCard>
      <VStack className="gap-2">
        <Heading title={d.projectsTitle} />
        {d.projects.length ? (
          <Rows>
            {d.projects.map((pr) => (
              <Row
                key={pr.id}
                title={pr.name}
                onPress={() => router.push(routeHref(`/projects/${pr.id}`))}
              />
            ))}
          </Rows>
        ) : (
          <Text className="text-subhead text-muted-foreground">{PERSON.noProjects}</Text>
        )}
      </VStack>
      <Tasks d={d} />
    </DetailPage>
  );
}
