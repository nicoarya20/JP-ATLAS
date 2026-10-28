// Settings ② Edit profile (prototype settings.profile.jsx): name, nickname, job and division, saved with
// `PATCH /api/app/profile`; Role (set by an Admin, from whoami) and Email (from Google) are read-only. The photo is
// shown but not changed here: uploading one needs an image picker, deferred (GAP P-5).
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { writeError } from '@/components/state/write-error';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { useProfileData } from '@/data/profile';
import { PROFILE_MAX, type ProfileWire, profileResource } from '@/data/profile.api';
import { saveProfile } from '@/data/profile.write';
import { ACCOUNT_ROLE } from '@/data/team.person';
import { roleOf } from '@/data/users.admin.wire';
import { whoamiResource } from '@/data/whoami.api';

import { PROFILE_EDIT as P } from './settings.strings';

/** Edit profile opened from the profile modal, which closes on the way here (it sits over the tabs). */
export const EDIT_FROM_PROFILE = {
  pathname: '/more/settings/profile',
  params: { from: 'profile' },
} as const satisfies Href;

const cut = (max: number) => (set: (s: string) => void) => (text: string) =>
  set(text.slice(0, max));

/** The form, once the profile is in; it starts from what the server has. */
function Form({ p, close }: { p: ProfileWire; close: () => void }) {
  const notice = useNotice();
  const d = useProfileData();
  const who = whoamiResource.useSnapshot().data;
  const [full, setFull] = useState(p.displayName ?? p.name);
  const [nickname, setNickname] = useState(p.nickname ?? '');
  const [title, setTitle] = useState(p.jobTitle ?? '');
  const [division, setDivision] = useState(p.department ?? '');
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const blank = !full.trim();
    setMissing(blank);
    if (blank || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Blank clears a field; the server keeps it as null.
      await saveProfile({ displayName: full, nickname, jobTitle: title, department: division });
    } catch (e) {
      // Handled: the reason stays on the form and Save can be pressed again.
      setError(writeError(e));
      setBusy(false);
      return;
    }
    setBusy(false);
    notice(P.saved);
    close();
  };
  const foot = (
    <>
      <Button size="lg" variant="outline" className="flex-1" isDisabled={busy} onPress={close}>
        <ButtonText>{P.cancel}</ButtonText>
      </Button>
      <Button
        size="lg"
        className="flex-1"
        isDisabled={busy}
        accessibilityState={{ busy, disabled: busy }}
        onPress={() => void save()}
      >
        {busy && <ButtonSpinner />}
        <ButtonText>{P.save}</ButtonText>
      </Button>
    </>
  );
  return (
    <DetailPage testID="screen-profile-edit" title={P.title} foot={foot}>
      <VStack className="items-center">
        <Avatar
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="h-20 w-20 bg-accent"
        >
          <AvatarFallbackText className="text-page font-semibold text-accent-foreground">
            {full || p.name}
          </AvatarFallbackText>
          {d.image ? <AvatarImage source={{ uri: d.image }} /> : null}
        </Avatar>
      </VStack>
      <Field
        label={P.full}
        required
        value={full}
        onChangeText={cut(PROFILE_MAX.name)(setFull)}
        error={missing ? P.fullMissing : undefined}
      />
      <Field
        label={P.nickname}
        value={nickname}
        onChangeText={cut(PROFILE_MAX.nickname)(setNickname)}
      />
      <Field label={P.job} value={title} onChangeText={cut(PROFILE_MAX.title)(setTitle)} />
      <Field
        label={P.division}
        value={division}
        onChangeText={cut(PROFILE_MAX.department)(setDivision)}
      />
      <Field
        label={P.role}
        value={who ? ACCOUNT_ROLE[roleOf(who.role)] : ''}
        hint={P.roleHint}
        readOnly
      />
      <Field label={P.email} value={p.email} hint={P.emailHint} readOnly />
      {error && <FormError testID="profile-edit-error">{error}</FormError>}
    </DetailPage>
  );
}

/** Edit my profile. */
export function ProfileEditScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const state = profileResource.useSnapshot();
  useEffect(() => {
    void profileResource.ensure();
    void whoamiResource.ensure();
  }, []);
  // Back alone would land on a tab, not where Edit profile was opened: reopen the profile modal then.
  const close = () => {
    router.back();
    if (from === EDIT_FROM_PROFILE.params.from) router.navigate('/profile');
  };
  if (state.data) return <Form p={state.data} close={close} />;
  return (
    <DetailPage testID="screen-profile-edit" title={P.title}>
      {state.phase === 'failed' ? (
        <FailedState
          testID="profile-edit-failed"
          message={state.error?.message}
          onRetry={() => void profileResource.reload()}
        />
      ) : (
        <LoadingState testID="profile-edit-loading" />
      )}
    </DetailPage>
  );
}
