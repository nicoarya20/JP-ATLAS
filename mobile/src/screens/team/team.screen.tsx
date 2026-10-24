// Team ① list and ③ empty (prototype team.list.jsx): who is on my team and their live task load, per role.
import { ChevronDown, Users } from 'lucide-react-native';
import { useState } from 'react';

import { Rows } from '@/components/list/rows';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage, SectionCard } from '@/components/screen/detail-page';
import { SearchField } from '@/components/search/search-field';
import { EmptyState } from '@/components/state/empty-state';
import { NoMatch } from '@/components/state/no-match';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import type { Project, Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { useTasks } from '@/data/tasks.state';
import { getTeam } from '@/data/team';

import { PersonRow } from './person-row';
import { TEAM, TEAM_EMPTY } from './team.strings';

/** A picker the prototype only names in a notice (project, sort). */
function NoticePicker({ label, notice }: { label: string; notice: string }) {
  const show = useNotice();
  return (
    <Button size="sm" variant="outline" onPress={() => show(notice)}>
      <ButtonText>{label}</ButtonText>
      <ButtonIcon as={ChevronDown} />
    </Button>
  );
}

type TeamScreenProps = {
  /** Who is signed in (K12). */
  role?: Role;
  /** Projects to read membership from; the sample's by default. */
  projects?: readonly Project[];
};

/** The Team list. */
export function TeamScreen({ role = SESSION_ROLE, projects }: TeamScreenProps) {
  const tasks = useTasks((s) => s.tasks);
  const [search, setSearch] = useState('');
  const data = getTeam(role, { tasks, projects });
  if (data.empty) {
    return (
      <DetailPage testID="screen-team" title={TEAM.title} tabBar>
        <EmptyState
          testID="team-empty"
          icon={Users}
          iconLabel={TEAM_EMPTY.icon}
          title={TEAM_EMPTY.title}
          text={TEAM_EMPTY.text}
        />
      </DetailPage>
    );
  }
  const q = search.trim().toLowerCase();
  const people = data.people.filter((o) => o.full.toLowerCase().includes(q));
  return (
    <DetailPage testID="screen-team" title={TEAM.title} tabBar>
      <Text className="text-subhead text-muted-foreground">{TEAM.intro}</Text>
      <HStack className="flex-wrap gap-2">
        <NoticePicker label={TEAM.project} notice={TEAM.projectNotice} />
        <NoticePicker label={TEAM.sort} notice={TEAM.sortNotice} />
      </HStack>
      <SearchField placeholder={TEAM.search} value={search} onChangeText={setSearch} />
      <SectionCard>
        <Text className="text-subhead">{data.summary}</Text>
      </SectionCard>
      {people.length ? (
        <Rows testID="team-rows">
          {people.map((o) => (
            <PersonRow key={o.key} o={o} />
          ))}
        </Rows>
      ) : (
        <NoMatch title={TEAM.noMatch} onReset={() => setSearch('')} />
      )}
      {data.note && <Text className="text-footnote text-muted-foreground">{data.note}</Text>}
    </DetailPage>
  );
}
