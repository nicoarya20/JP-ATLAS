// Project detail ⑪ Members (prototype projects.tabs.jsx ProjectsMembers): a card per member with their project role,
// the only-Manager note and what each role means. A role change and a removal are real writes now
// (`PATCH`/`DELETE /projects/:id/members/:userId`), each behind its confirmation (T2) with a busy button, a notice on
// success and the server's own sentence on refusal.
//
// Three things changed with the server:
//
// - **A member is addressed by `userId`, never by name.** The testID, the React key and both writes carry the id; only
//   the words a person reads carry the name. Two people called Budi used to collide silently (K4).
// - **`can.update` decides whether the controls exist at all.** The old client-side guards — the last Manager, the
//   Lead, removing yourself — are gone: the server decides them when the write lands
//   (`server/project/member.service.ts`) and the refusal arrives with its own sentence. The Lead's own two controls
//   stay disabled here, because that one the rows can see coming and the note explains it.
// - **The sub line is the job title alone.** `ProjectMemberItem` carries no department (GAP A-9).
//
// "+ Member" has a route (`POST /members`) but no picker on this side yet, so it still only says so. Listed in
// docs/phase2-gap-disembunyikan.md.
import { useEffect, useState } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { ConfirmDialog } from '@/components/confirm/confirm-dialog';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { changeProjectMemberRole, removeProjectMember } from '@/data/projects.api.write';
import { roleWire } from '@/data/projects.api.values';
import {
  ensureProjectMembers,
  PROJECT_ROLES_LIST,
  type ProjectMembers,
  reloadProjectMembers,
  useProjectMembers,
} from '@/data/projects.detail';
import type { ProjectRole } from '@/data/sample/projects.extra';

import { Head, Note, Sec, Soft } from '../parts/display';
import { MEMBERS } from '../projects.strings';
import { ADDED, NAMES } from '../projects.strings.added';

type Card = ProjectMembers['cards'][number];

/** The change waiting for its confirmation: who it is addressed to, and the role when it is one. */
type Pending = { userId: string; full: string; role?: ProjectRole } | null;

/** "Nico Pratama, (You), Lead, Design". */
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
    <Sec testID={`member-${m.userId}`}>
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
                label={MEMBERS.role(m.full)}
                options={ROLE_OPTIONS}
                value={m.role}
                disabled={m.lead}
                hint={m.lead ? ADDED.leadStays : undefined}
                onChange={(role) =>
                  role !== m.role && onAsk({ userId: m.userId, full: m.full, role })
                }
              />
            </VStack>
            <Button
              variant="link"
              isDisabled={m.lead}
              accessibilityLabel={MEMBERS.removeLabel(m.full)}
              accessibilityHint={m.lead ? ADDED.leadStays : undefined}
              onPress={() => onAsk({ userId: m.userId, full: m.full })}
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

/** The Members tab of project `id`; `project` is its name, which the confirmations talk about. */
export function MembersTab({ id, project }: { id: string; project: string }) {
  const notice = useNotice();
  const m = useProjectMembers(id);
  const [pending, setPending] = useState<Pending>(null);
  useEffect(() => {
    void ensureProjectMembers(id);
  }, [id]);
  const role = pending?.role;
  const name = pending?.full ?? '';
  const canEdit = m.manage === 'on';
  // Thrown on, not caught: the dialog keeps itself open and shows the sentence `errorText` picks.
  const confirm = async () => {
    if (!pending) return;
    if (role) await changeProjectMemberRole(id, pending.userId, roleWire(role));
    else await removeProjectMember(id, pending.userId);
    notice(role ? MEMBERS.roleChanged : MEMBERS.removed);
  };
  if (m.phase === 'failed' && m.cards.length === 0) {
    return (
      <FailedState
        testID="project-members-failed"
        message={m.error?.message}
        onRetry={() => void reloadProjectMembers(id)}
      />
    );
  }
  if (m.count === null) return <LoadingState testID="project-members-loading" />;
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
        <MemberCard key={c.userId} m={c} canEdit={canEdit} onAsk={setPending} />
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
        title={role ? MEMBERS.roleTitle(name) : MEMBERS.removeTitle(name)}
        message={
          role ? MEMBERS.roleMessage(name, role, project) : MEMBERS.removeMessage(name, project)
        }
        confirmLabel={role ? MEMBERS.roleConfirm : MEMBERS.removeConfirm}
        danger={!role}
        onConfirm={confirm}
        // The server's own refusal, as it came (K5), rather than a generic "Could not finish".
        errorText={(e) => (e instanceof Error ? e.message : MEMBERS.failed)}
      />
    </>
  );
}
