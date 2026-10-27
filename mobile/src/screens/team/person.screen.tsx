// Team ② Person: the contact facts the server sent for this viewer, the projects they share, and
// their open tasks when the viewer may count them. Which facts arrive *is* the permission rule:
// the server leaves out what a caller may not see, so a missing key hides a row (A-19, B-17).
import { router } from 'expo-router';
import { UserX } from 'lucide-react-native';
import { useEffect } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { Facts } from '@/components/list/facts';
import { Row, Rows } from '@/components/list/rows';
import { DetailPage, SectionCard } from '@/components/screen/detail-page';
import { EmptyState } from '@/components/state/empty-state';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { StatusPill } from '@/components/status/status-pill';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { Role } from '@/data/sample';
import { PERSON_TASKS_MAX, teamPerson } from '@/data/team.api';
import { getTeamPerson, type TeamPersonData } from '@/data/team.person';
import { ensureWhoami, whoamiResource, whoamiRole } from '@/data/whoami.api';

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

/** Open tasks, or why the viewer may not see them. */
function Tasks({ d }: { d: TeamPersonData }) {
  if (!d.tasks) {
    return (
      <SectionCard>
        <Text className="text-subhead">{PERSON.hiddenTasks}</Text>
      </SectionCard>
    );
  }
  const { load, rows, capped } = d.tasks;
  return (
    <VStack className="gap-2">
      <Heading title={PERSON.tasks} right={load && PERSON.load(load.active, load.overdue)} />
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
      {capped && (
        <Text className="text-footnote text-muted-foreground">
          {PERSON.capped(PERSON_TASKS_MAX)}
        </Text>
      )}
      {d.elsewhere && <Text className="text-footnote text-muted-foreground">{d.elsewhere}</Text>}
    </VStack>
  );
}

/** Team member `id` (an account id). */
export function PersonScreen({ id, role }: { id: string; role?: Role }) {
  const person = teamPerson(id);
  const state = person.use();
  whoamiResource.use();
  useEffect(() => {
    void person.ensure();
    void ensureWhoami();
  }, [person]);
  const d = getTeamPerson(id, role ?? whoamiRole());
  const frame = (children: React.ReactNode) => (
    <DetailPage testID="screen-team-person" title={PERSON.title} tabBar>
      {children}
    </DetailPage>
  );
  if (!d) {
    // A person the caller shares no project with answers 404 — the caller may not learn the account
    // exists — so "not found" covers both a missing person and a hidden one, deliberately.
    if (state.phase === 'failed') {
      return frame(
        state.error?.status === 404 ? (
          <EmptyState icon={UserX} title={PERSON.missingTitle} text={PERSON.missingText} />
        ) : (
          <FailedState
            testID="person-failed"
            message={state.error?.message}
            onRetry={() => void person.reload()}
          />
        ),
      );
    }
    return frame(<LoadingState testID="person-loading" />);
  }
  return frame(
    <>
      <HStack className="items-center gap-3">
        <PersonAvatar name={d.full} size="xl" />
        <VStack className="min-w-0 flex-1 gap-1">
          <Text accessibilityRole="header" className="text-page font-bold">
            {d.full}
          </Text>
          <StatusText status={d.status} />
        </VStack>
      </HStack>
      <SectionCard>
        <Facts facts={d.facts} />
      </SectionCard>
      <VStack className="gap-2">
        <Heading title={d.projectsTitle} />
        {d.projects.length ? (
          <Rows>
            {d.projects.map((pr) => (
              <Row key={pr.id} title={pr.name} onPress={() => router.push(`/projects/${pr.id}`)} />
            ))}
          </Rows>
        ) : (
          <Text className="text-subhead text-muted-foreground">{PERSON.noProjects}</Text>
        )}
      </VStack>
      <Tasks d={d} />
    </>,
  );
}
