// Auth ③ Awaiting approval (prototype auth.pending.jsx): status card and the profile form; no other menus until an
// Admin approves. Sign out asks first (T2); Check status reads the session again, and the gate lets an approved account
// through by itself. Identity comes from the session; the profile form is still sample data until Phase 2 step 3.
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage, SectionCard } from '@/components/screen/detail-page';
import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getAuth } from '@/data/auth';
import { refreshSession, useSession } from '@/session';

import { APP_NAME, PENDING } from './auth.strings';
import { Media } from './auth-parts';
import { SignOutDialog } from './sign-out';

/** The sign-up waiting for an Admin. */
export function PendingScreen() {
  const notice = useNotice();
  const { user } = useSession();
  const { profile } = getAuth();
  const [full, setFull] = useState<string>(user?.name ?? profile.full);
  const [nickname, setNickname] = useState<string>(profile.nickname);
  const [job, setJob] = useState('');
  const [division, setDivision] = useState('');
  const [missing, setMissing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [checking, setChecking] = useState(false);
  const save = () => {
    setMissing(!full.trim());
    if (full.trim()) notice(PENDING.saved);
  };
  // Approval happens on the server; this asks again. An approved account leaves this screen because
  // the gate follows the session store, so there is nothing to navigate to here.
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
      <Text accessibilityRole="header" className="text-section font-semibold">
        {PENDING.profile}
      </Text>
      <HStack className="items-center gap-3">
        <Media label={PENDING.photo} small />
        <VStack className="items-start gap-2">
          <Text className="text-footnote text-muted-foreground">{PENDING.photoFrom}</Text>
          <Button size="sm" variant="outline" onPress={() => notice(PENDING.changePhotoNotice)}>
            <ButtonText>{PENDING.changePhoto}</ButtonText>
          </Button>
        </VStack>
      </HStack>
      <Field
        label={PENDING.full}
        required
        value={full}
        onChangeText={setFull}
        error={missing ? PENDING.fullMissing : undefined}
      />
      <Field label={PENDING.email} value={user?.email ?? profile.email} readOnly />
      <Field label={PENDING.nickname} value={nickname} onChangeText={setNickname} />
      <Field label={PENDING.job} value={job} onChangeText={setJob} placeholder={PENDING.jobHint} />
      <Field
        label={PENDING.division}
        value={division}
        onChangeText={setDivision}
        placeholder={PENDING.divisionHint}
      />
      <Button size="lg" onPress={save}>
        <ButtonText>{PENDING.save}</ButtonText>
      </Button>
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
