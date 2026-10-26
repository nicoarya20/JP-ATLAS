// Users ① sign-up card (prototype users.approve.jsx Pending / Rejecting): Approve with a starting role, or Reject, which
// opens the reason field first (the prototype's Reject on a pending card only said "Write a reason first"). Every
// decision asks first (T2); once confirmed, the sign-up leaves the list.
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
import type { AccountRole } from '@/data/people';
import { type ApprovalItem, decide, GRANTABLE_ROLES } from '@/data/users';

import type { UserAsk } from './users.confirm';
import { APPROVAL, CONFIRM } from './users.strings';

const ROLE_OPTIONS = GRANTABLE_ROLES.map((r) => ({ value: r, label: r }));

/** Sign-up header: avatar, name, request time, email, then the profile line. */
function Who({ u }: { u: ApprovalItem }) {
  return (
    <HStack className="items-start gap-3">
      <PersonAvatar name={u.full} />
      <VStack className="min-w-0 flex-1 gap-1">
        <HStack className="flex-wrap justify-between gap-1">
          <Text className="font-semibold">{u.full}</Text>
          <Text className="text-footnote text-muted-foreground">{`${u.day} · ${u.time}`}</Text>
        </HStack>
        <Text className="text-footnote">{u.email}</Text>
        <Text className="text-footnote text-muted-foreground">
          {u.job && u.division ? APPROVAL.position(u.job, u.division) : APPROVAL.noProfile}
        </Text>
      </VStack>
    </HStack>
  );
}

/** One sign-up waiting for a decision. */
export function ApprovalCard({ u, ask }: { u: ApprovalItem; ask: (a: UserAsk) => void }) {
  const notice = useNotice();
  const [rejecting, setRejecting] = useState(u.draft !== undefined);
  const [role, setRole] = useState<AccountRole>('Member');
  const [reason, setReason] = useState(u.draft ?? '');
  const [missing, setMissing] = useState(false);
  const approve = () =>
    ask({
      ...CONFIRM.approve(u.full, role),
      run: () => {
        decide(u.key, 'approved');
        notice(APPROVAL.approved(role));
      },
    });
  const reject = () => {
    const empty = !reason.trim();
    setMissing(empty);
    if (empty) return;
    ask({
      ...CONFIRM.reject(u.full, u.email),
      danger: true,
      run: () => {
        decide(u.key, 'rejected');
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
    <SectionCard testID={`pending-${u.key}`}>
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
