// Users ① cards (prototype users.approve.jsx Pending / Rejecting): Sari waits for a decision, Budi is being rejected.
// Every decision asks first (T2), then shows a notice.
import type { ReactNode } from 'react';
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
import type { PendingUser } from '@/data/sample/users';
import { GRANTABLE_ROLES } from '@/data/users';

import type { UserAsk } from './users.confirm';
import { APPROVAL, CONFIRM } from './users.strings';

const ROLE_OPTIONS = GRANTABLE_ROLES.map((r) => ({ value: r, label: r }));

/** Sign-up header: avatar, name, request time, email, then extra lines. */
function Who({ u, children }: { u: PendingUser; children: ReactNode }) {
  return (
    <HStack className="items-start gap-3">
      <PersonAvatar name={u.full} />
      <VStack className="min-w-0 flex-1 gap-1">
        <HStack className="flex-wrap justify-between gap-1">
          <Text className="font-semibold">{u.full}</Text>
          <Text className="text-footnote text-muted-foreground">{`${u.day} · ${u.time}`}</Text>
        </HStack>
        <Text className="text-footnote">{u.email}</Text>
        {children}
      </VStack>
    </HStack>
  );
}

type CardProps = { u: PendingUser; ask: (a: UserAsk) => void };

/** Sari: pick a starting role, then Approve; Reject needs a reason first. */
export function PendingCard({ u, ask }: CardProps) {
  const notice = useNotice();
  const [role, setRole] = useState<AccountRole>('Member');
  const approve = () =>
    ask({ ...CONFIRM.approve(u.full, role), run: () => notice(APPROVAL.approved(role)) });
  return (
    <SectionCard testID={`pending-${u.key}`}>
      <Who u={u}>
        {u.job && u.division && (
          <Text className="text-footnote text-muted-foreground">
            {APPROVAL.position(u.job, u.division)}
          </Text>
        )}
      </Who>
      <HStack className="items-center justify-between gap-3">
        <Text className="text-subhead">{APPROVAL.startingRole}</Text>
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
        <Button variant="outline" className="flex-1" onPress={() => notice(APPROVAL.reasonFirst)}>
          <ButtonText>{APPROVAL.reject}</ButtonText>
        </Button>
        <Button className="flex-1" onPress={approve}>
          <ButtonText>{APPROVAL.approve}</ButtonText>
        </Button>
      </HStack>
    </SectionCard>
  );
}

/** Budi: the reason (required) is shown to him at sign-in; Reject user asks first. */
export function RejectingCard({ u, ask, draft }: CardProps & { draft: string }) {
  const notice = useNotice();
  const [reason, setReason] = useState(draft);
  const [missing, setMissing] = useState(false);
  const reject = () => {
    const empty = !reason.trim();
    setMissing(empty);
    if (empty) return;
    ask({ ...CONFIRM.reject(u.full, u.email), danger: true, run: () => notice(APPROVAL.rejected) });
  };
  return (
    <SectionCard testID={`pending-${u.key}`}>
      <Who u={u}>
        <Text className="text-footnote text-muted-foreground">{APPROVAL.noProfile}</Text>
      </Who>
      <Field
        label={APPROVAL.reason}
        multiline
        value={reason}
        onChangeText={setReason}
        hint={APPROVAL.reasonHint}
        error={missing ? APPROVAL.reasonFirst : undefined}
      />
      <HStack className="gap-2">
        <Button variant="outline" className="flex-1" onPress={() => notice(APPROVAL.canceled)}>
          <ButtonText>{APPROVAL.cancel}</ButtonText>
        </Button>
        <Button variant="destructive" className="flex-1" onPress={reject}>
          <ButtonText>{APPROVAL.rejectUser}</ButtonText>
        </Button>
      </HStack>
    </SectionCard>
  );
}
