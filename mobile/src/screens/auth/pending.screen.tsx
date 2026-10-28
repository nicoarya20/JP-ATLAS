// Auth ③ Awaiting approval (prototype auth.pending.jsx): the status card, with no other menus until an Admin approves.
// Sign out asks first (T2); Check status reads the session again, and the gate lets an approved account through by
// itself. The prototype's profile form is not here: the server answers a pending account's `PATCH /api/app/profile`
// with 403 ACCOUNT_PENDING, so a Save there could only pretend (gap doc §3, "Edit profil di layar Pending").
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { DetailPage, SectionCard } from '@/components/screen/detail-page';
import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { refreshSession } from '@/session';

import { APP_NAME, PENDING } from './auth.strings';
import { SignOutDialog } from './sign-out';

/** The sign-up waiting for an Admin; the (auth) stack only registers it while the session is `pending`. */
export function PendingScreen() {
  const notice = useNotice();
  const [signingOut, setSigningOut] = useState(false);
  const [checking, setChecking] = useState(false);
  // Approval happens on the server; this asks again. An approved account leaves this screen because the gate follows
  // the session store, so there is nothing to navigate to here. refreshSession never rejects: a failure lands in the
  // store as `unreachable`, which the root layout turns into the retry screen.
  const check = () => {
    if (checking) return;
    setChecking(true);
    void refreshSession().then((status) => {
      setChecking(false);
      if (status === 'pending') notice(PENDING.stillPending);
    });
  };
  const signOutButton = (
    <Button size="sm" variant="outline" onPress={() => setSigningOut(true)}>
      <ButtonText>{PENDING.signOut}</ButtonText>
    </Button>
  );
  return (
    <DetailPage testID="screen-pending" title={APP_NAME} back={false} right={signOutButton}>
      <SectionCard>
        <HStack className="items-start justify-between gap-2">
          <Text className="flex-1 font-semibold">{PENDING.status}</Text>
          <StatusPill status={PENDING.pill} />
        </HStack>
        <Text className="text-subhead">{PENDING.statusText}</Text>
      </SectionCard>
      <Button
        size="lg"
        variant="outline"
        onPress={check}
        isDisabled={checking}
        accessibilityState={{ busy: checking, disabled: checking }}
      >
        {checking && <ButtonSpinner />}
        <ButtonText>{PENDING.check}</ButtonText>
      </Button>
      <Text className="text-footnote text-muted-foreground">{PENDING.footer}</Text>
      <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
    </DetailPage>
  );
}
