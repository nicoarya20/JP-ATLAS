// Users ① sign-up card (prototype users.approve.jsx Pending / Rejecting): Approve with a starting role, or Reject, which
// opens the reason field first. Every decision asks first (T2) and goes to `/api/admin/users/:id/{approve,reject}`;
// once the server took it, the lists are read again and the sign-up leaves this one.
import { useState } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { Field } from '@/components/form/field';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { SectionCard } from '@/components/screen/detail-page';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { AccountRoleWire } from '@/data/team.api';
import { ACCOUNT_ROLE } from '@/data/team.person';
import type { SignUpCard } from '@/data/users.admin.view';
import { GRANTABLE } from '@/data/users.admin.wire';
import { approveUser, rejectUser } from '@/data/users.admin.write';

import type { UserAsk } from './users.confirm';
import { APPROVAL, CONFIRM } from './users.strings';

const ROLE_OPTIONS = GRANTABLE.map((r) => ({ value: r, label: ACCOUNT_ROLE[r] }));

/** Sign-up header: avatar, name, when they asked, email. */
function Who({ u }: { u: SignUpCard }) {
  return (
    <HStack className="items-start gap-3">
      <PersonAvatar name={u.full} />
      <VStack className="min-w-0 flex-1 gap-1">
        <HStack className="flex-wrap justify-between gap-1">
          <Text className="font-semibold">{u.full}</Text>
          <Text className="text-footnote text-muted-foreground">{u.asked}</Text>
        </HStack>
        <Text className="text-footnote">{u.email}</Text>
      </VStack>
    </HStack>
  );
}

/** One sign-up waiting for a decision. */
export function ApprovalCard({ u, ask }: { u: SignUpCard; ask: (a: UserAsk) => void }) {
  const notice = useNotice();
  const [rejecting, setRejecting] = useState(false);
  const [role, setRole] = useState<AccountRoleWire>('member');
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const approve = () =>
    ask({
      ...CONFIRM.approve(u.full, ACCOUNT_ROLE[role]),
      run: async () => {
        await approveUser(u.id, role);
        notice(APPROVAL.approved(ACCOUNT_ROLE[role]));
      },
    });
  const reject = () => {
    const empty = !reason.trim();
    setMissing(empty);
    if (empty) return;
    ask({
      ...CONFIRM.reject(u.full, u.email),
      danger: true,
      run: async () => {
        await rejectUser(u.id, reason);
        notice(APPROVAL.rejected);
      },
    });
  };
  const cancel = () => {
    setRejecting(false);
    setMissing(false);
    notice(APPROVAL.canceled);
  };
  return (
    <SectionCard testID={`pending-${u.id}`}>
      <Who u={u} />
      {rejecting ? (
        <>
          <Field
            label={APPROVAL.reason}
            multiline
            value={reason}
            onChangeText={setReason}
            hint={APPROVAL.reasonHint}
            error={missing ? APPROVAL.reasonFirst : undefined}
          />
          <HStack className="gap-2">
            <Button
              variant="outline"
              className="flex-1"
              accessibilityLabel={APPROVAL.cancelWho(u.full)}
              onPress={cancel}
            >
              <ButtonText>{APPROVAL.cancel}</ButtonText>
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              accessibilityLabel={APPROVAL.rejectWho(u.full)}
              onPress={reject}
            >
              <ButtonText>{APPROVAL.rejectUser}</ButtonText>
            </Button>
          </HStack>
        </>
      ) : (
        <>
          <HStack className="items-center justify-between gap-3">
            {/* The picker is named "Starting role" itself; read here too, it would be said twice. */}
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="text-subhead"
            >
              {APPROVAL.startingRole}
            </Text>
            <VStack className="w-48">
              <SelectField
                label={APPROVAL.startingRole}
                options={ROLE_OPTIONS}
                value={role}
                onChange={setRole}
              />
            </VStack>
          </HStack>
          <HStack className="gap-2">
            <Button
              variant="outline"
              className="flex-1"
              accessibilityLabel={APPROVAL.rejectWho(u.full)}
              onPress={() => setRejecting(true)}
            >
              <ButtonText>{APPROVAL.reject}</ButtonText>
            </Button>
            <Button
              className="flex-1"
              accessibilityLabel={APPROVAL.approveWho(u.full)}
              onPress={approve}
            >
              <ButtonText>{APPROVAL.approve}</ButtonText>
            </Button>
          </HStack>
        </>
      )}
    </SectionCard>
  );
}
