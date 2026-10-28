// Project detail ⑪ Members (prototype projects.tabs.jsx ProjectsMembers) from the server: a card per member with
// their project role, the only-Manager note and what each role means.
import { PersonAvatar } from '@/components/avatar/person-avatar';
import { Badge, BadgeText } from '@/components/ui/badge';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { projectMembersResource } from '@/data/projects.api';
import { getProjectMembers, type MemberCard as Member } from '@/data/projects.view.tabs';

import { Head, Note, Sec, Soft } from '../parts/display';
import { Loaded } from '../parts/loaded';
import { MEMBERS } from '../projects.strings';

/** "Nico Pratama, (You), Lead, Designer, Manager". */
const who = (m: Member) =>
  [m.full, m.you && MEMBERS.you, m.lead && MEMBERS.lead, m.sub, m.roleLabel]
    .filter(Boolean)
    .join(', ');

function MemberCard({ m }: { m: Member }) {
  return (
    <Sec testID={`member-${m.userId}`}>
      {/* Avatar, name, (You), Lead, job and role read once, as one stop. */}
      <HStack accessible accessibilityLabel={who(m)} className="items-center gap-3">
        <PersonAvatar name={m.full} />
        <VStack className="flex-1 gap-1">
          <HStack className="flex-wrap items-center gap-2">
            <Text className="font-semibold">{m.full}</Text>
            {m.you && <Text className="text-subhead">{MEMBERS.you}</Text>}
            {m.lead && (
              <Badge variant="outline">
                <BadgeText>{MEMBERS.lead}</BadgeText>
              </Badge>
            )}
          </HStack>
          {!!m.sub && <Note>{m.sub}</Note>}
        </VStack>
        <Text className="text-subhead font-semibold">{m.roleLabel}</Text>
      </HStack>
    </Sec>
  );
}

function List({ id, canEdit }: { id: string; canEdit: boolean }) {
  const m = getProjectMembers(id);
  if (!m) return null;
  return (
    <>
      <Note>{m.count}</Note>
      {m.cards.map((c) => (
        <MemberCard key={c.userId} m={c} />
      ))}
      {canEdit && m.onlyManager && <Soft>{MEMBERS.onlyManager(m.onlyManager)}</Soft>}
    </>
  );
}

/** The Members tab of project id; canEdit: the server lets the viewer edit the project (`can.update`). */
export function MembersTab({ id, canEdit }: { id: string; canEdit: boolean }) {
  return (
    <>
      <Loaded res={projectMembersResource(id)} testID="members">
        {() => <List id={id} canEdit={canEdit} />}
      </Loaded>
      <Head>{MEMBERS.rolesTitle}</Head>
      <VStack className="gap-2">
        {MEMBERS.roles.map(([name, what]) => (
          <HStack key={name} className="gap-3">
            <Text className="w-20 text-subhead font-semibold">{name}</Text>
            <Text className="flex-1 text-subhead">{what}</Text>
          </HStack>
        ))}
      </VStack>
    </>
  );
}
