// Team ② Person (prototype team.person.jsx), from `GET /api/app/team/:userId`: the facts the server sent, the projects
// shared with them, and their open tasks when the viewer may see them.
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
import { teamPersonResource } from '@/data/team.api';
import { getTeamPerson, type TeamPersonData } from '@/data/team.person';

import { PERSON, rowLabel } from './team.strings';

const Heading = ({ title, right }: { title: string; right?: string }) => (
  <HStack className="items-center justify-between gap-2">
    <Text accessibilityRole="header" className="text-section font-semibold">
      {title}
    </Text>
    {right && <Text className="text-footnote text-muted-foreground">{right}</Text>}
  </HStack>
);

const Note = ({ children }: { children: string }) => (
  <Text className="text-footnote text-muted-foreground">{children}</Text>
);

/** Open tasks, or why the viewer may not see them. */
function Tasks({ d }: { d: TeamPersonData }) {
  if (!d.tasks) {
    return (
      <SectionCard testID="person-tasks-hidden">
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
      {capped && load && <Note>{PERSON.capped(rows.length, load.active)}</Note>}
    </VStack>
  );
}

/** Team member `id`: the person's account id. */
export function PersonScreen({ id }: { id: string }) {
  const res = teamPersonResource(id);
  const state = res.useSnapshot();
  const d = getTeamPerson(id);

  useEffect(() => {
    void teamPersonResource(id).ensure();
  }, [id]);

  if (!d) {
    // Someone who shares no project answers 404, the same as an account that does not exist.
    const missing = state.error?.status === 404;
    return (
      <DetailPage testID="screen-team-person" title={PERSON.title} tabBar>
        {state.phase !== 'failed' ? (
          <LoadingState testID="person-loading" />
        ) : missing ? (
          <EmptyState
            testID="person-missing"
            icon={UserX}
            title={PERSON.missingTitle}
            text={state.error?.message}
          />
        ) : (
          <FailedState
            testID="person-failed"
            message={state.error?.message}
            onRetry={() => void res.reload()}
          />
        )}
      </DetailPage>
    );
  }
  return (
    <DetailPage testID="screen-team-person" title={PERSON.title} tabBar>
      <HStack className="items-center gap-3">
        <PersonAvatar name={d.full} size="xl" />
        <VStack className="min-w-0 flex-1 gap-1">
          <Text accessibilityRole="header" className="text-page font-bold">
            {d.full}
          </Text>
          {d.leave && <Note>{d.leave}</Note>}
        </VStack>
      </HStack>
      {d.facts.length > 0 && (
        <SectionCard>
          <Facts facts={d.facts} />
        </SectionCard>
      )}
      <VStack className="gap-2">
        <Heading title={d.projectsTitle} />
        {d.projects.length ? (
          <Rows>
            {d.projects.map((pr) => (
              <Row
                key={pr.id}
                title={pr.name}
                sub={pr.role}
                onPress={() => router.push(`/projects/${pr.id}`)}
              />
            ))}
          </Rows>
        ) : (
          <Text className="text-subhead text-muted-foreground">{PERSON.noProjects}</Text>
        )}
      </VStack>
      <Tasks d={d} />
      {d.elsewhere && <Note>{PERSON.elsewhere(d.full)}</Note>}
    </DetailPage>
  );
}
