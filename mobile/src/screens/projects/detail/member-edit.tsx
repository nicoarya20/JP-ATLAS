// The member changes of the Members tab: a role picker and Remove per member, and the T2 confirmation each opens
// (UX §1). The Lead's role is fixed (they stay a Manager) and nobody removes themselves, each saying why.
import { ConfirmDialog } from '@/components/confirm/confirm-dialog';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { projectResource } from '@/data/projects.api';
import { ROLE_CHOICES } from '@/data/projects.form';
import type { MemberCard as Member } from '@/data/projects.view.tabs';
import type { ProjectRoleWire } from '@/data/projects.wire';
import { removeMember, setMemberRole } from '@/data/projects.write';
import { PROJECT_ROLE } from '@/data/team';

import { writeError } from '../parts/write-run';
import { MEMBERS } from '../projects.strings';
import { ADDED } from '../projects.strings.added';

/** The change waiting for its confirmation. */
export type Ask =
  | { kind: 'role'; m: Member; role: ProjectRoleWire }
  | { kind: 'remove'; m: Member };

/** Role picker and Remove of one member; the Lead's role is fixed and your own Remove is off, each saying why. */
export function MemberEdit({ m, onAsk }: { m: Member; onAsk: (a: Ask) => void }) {
  const why = m.you ? MEMBERS.selfRemove : undefined;
  return (
    <HStack className="items-center gap-2">
      <VStack className="flex-1">
        <SelectField
          label={MEMBERS.role(m.full)}
          testID={`member-role-${m.userId}`}
          options={ROLE_CHOICES}
          value={m.role}
          disabled={m.lead}
          hint={m.lead ? ADDED.leadStays : undefined}
          onChange={(role) => role !== m.role && onAsk({ kind: 'role', m, role })}
        />
      </VStack>
      {!m.lead && (
        <Button
          variant="outline"
          isDisabled={m.you}
          accessibilityLabel={MEMBERS.removeLabel(m.full)}
          accessibilityHint={why}
          onPress={() => onAsk({ kind: 'remove', m })}
        >
          <ButtonText className="text-destructive">{MEMBERS.remove}</ButtonText>
        </Button>
      )}
    </HStack>
  );
}

/** The T2 dialog of the change asked for; it closes once the server took it, and says so. */
export function MemberConfirm({
  id,
  ask,
  onClose,
}: {
  id: string;
  ask: Ask | null;
  onClose: () => void;
}) {
  const notice = useNotice();
  const project = projectResource(id).current()?.name ?? '';
  if (!ask) return null;
  const { m } = ask;
  const role = ask.kind === 'role';
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      testID="member-confirm"
      title={role ? MEMBERS.roleTitle(m.full) : MEMBERS.removeTitle(m.full)}
      message={
        role
          ? MEMBERS.roleMessage(m.full, PROJECT_ROLE[ask.role], project)
          : MEMBERS.removeMessage(m.full, project)
      }
      confirmLabel={role ? MEMBERS.roleConfirm : MEMBERS.removeConfirm}
      danger={!role}
      errorText={writeError}
      onConfirm={async () => {
        if (role) await setMemberRole(id, m.userId, ask.role);
        else await removeMember(id, m.userId);
        notice(role ? MEMBERS.roleChanged : MEMBERS.removed);
      }}
    />
  );
}
