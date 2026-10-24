// Project detail ⑪ Members (prototype projects.tabs.jsx ProjectsMembers): a card per member with their project role,
// the only-Manager note and what each role means. A Manager or Admin adds members (a notice in Phase 1), changes a role
// and removes a member, both after a confirmation (T2); the Lead stays Manager and can't be removed.
import { useState } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { ConfirmDialog } from '@/components/confirm/confirm-dialog';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { getProjectMembers } from '@/data/projects';
import { PROJECT_ROLES_LIST } from '@/data/projects.detail';
import { removeMember, setMemberRole } from '@/data/projects.store';
import type { ProjectRole } from '@/data/sample/projects.extra';

import { Head, Note, Sec, Soft } from '../parts/display';
import { MEMBERS } from '../projects.strings';
import { ADDED, NAMES } from '../projects.strings.added';

type Members = ReturnType<typeof getProjectMembers>;
type Card = Members['cards'][number];
/** The change waiting for its confirmation. */
type Pending = { name: string; role?: ProjectRole } | null;

/** "Nico Pratama, (You), Lead, Design · 6 tasks". */
const who = (m: Card) =>
  [m.full, m.you && MEMBERS.you, m.lead && MEMBERS.lead, m.sub].filter(Boolean).join(', ');

const ROLE_OPTIONS = PROJECT_ROLES_LIST.map((r) => ({ value: r, label: r }));

function MemberCard({
  m,
  canEdit,
  onAsk,
}: {
  m: Card;
  canEdit: boolean;
  onAsk: (p: Pending) => void;
}) {
  return (
    <Sec testID={`member-${m.name}`}>
      {/* Avatar, name, (You), Lead and the sub line read once, as one stop. */}
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
          <Note>{m.sub}</Note>
        </VStack>
      </HStack>
      {canEdit ? (
        <>
          <HStack className="items-center justify-between gap-2">
            <VStack className="flex-1">
              <SelectField
                label={MEMBERS.role(m.name)}
                options={ROLE_OPTIONS}
                value={m.role}
                disabled={m.lead}
                onChange={(role) => role !== m.role && onAsk({ name: m.name, role })}
              />
            </VStack>
            <Button
              variant="link"
              isDisabled={m.lead}
              accessibilityLabel={MEMBERS.removeLabel(m.name)}
              accessibilityHint={m.lead ? ADDED.leadStays : undefined}
              onPress={() => onAsk({ name: m.name })}
            >
              <ButtonText>{MEMBERS.remove}</ButtonText>
            </Button>
          </HStack>
          {m.lead && <Note>{ADDED.leadStays}</Note>}
        </>
      ) : (
        <Text className="text-subhead font-semibold">{m.role}</Text>
      )}
    </Sec>
  );
}

/** The Members tab of project id (`m` from getProjectMembers). */
export function MembersTab({ id, m, canEdit }: { id: string; m: Members; canEdit: boolean }) {
  const notice = useNotice();
  const [pending, setPending] = useState<Pending>(null);
  const role = pending?.role;
  const who = pending?.name ?? '';
  const confirm = () => {
    if (!pending) return;
    if (role) setMemberRole(id, pending.name, role);
    else removeMember(id, pending.name);
    notice(role ? MEMBERS.roleChanged : MEMBERS.removed);
  };
  return (
    <>
      <HStack className="items-center justify-between gap-2">
        <Note>{m.count}</Note>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            accessibilityLabel={NAMES.addMember}
            onPress={() => notice(MEMBERS.addNotice)}
          >
            <ButtonText>{MEMBERS.add}</ButtonText>
          </Button>
        )}
      </HStack>
      {m.cards.map((c) => (
        <MemberCard key={c.name} m={c} canEdit={canEdit} onAsk={setPending} />
      ))}
      {canEdit && m.onlyManager && <Soft>{MEMBERS.onlyManager(m.onlyManager)}</Soft>}
      <Head>{MEMBERS.rolesTitle}</Head>
      <VStack className="gap-2">
        {MEMBERS.roles.map(([name, what]) => (
          <HStack key={name} className="gap-3">
            <Text className="w-20 text-subhead font-semibold">{name}</Text>
            <Text className="flex-1 text-subhead">{what}</Text>
          </HStack>
        ))}
      </VStack>
      <ConfirmDialog
        testID="member-confirm"
        open={!!pending}
        onClose={() => setPending(null)}
        title={role ? MEMBERS.roleTitle(who) : MEMBERS.removeTitle(who)}
        message={role ? MEMBERS.roleMessage(who, role, m.name) : MEMBERS.removeMessage(who, m.name)}
        confirmLabel={role ? MEMBERS.roleConfirm : MEMBERS.removeConfirm}
        danger={!role}
        onConfirm={confirm}
      />
    </>
  );
}
