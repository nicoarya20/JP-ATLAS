// Settings ② Edit profile (prototype settings.profile.jsx): name, nickname, job and division; Role (set by an Admin)
// and Email (from Google) are read-only. Phase 1 saves nothing yet, only says so.
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { Field } from '@/components/form/field';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getProfileEdit } from '@/data/settings';

import { PROFILE_EDIT as P } from './settings.strings';

/** Edit profile opened from the profile modal, which closes on the way here (it sits over the tabs). */
export const EDIT_FROM_PROFILE = {
  pathname: '/more/settings/profile',
  params: { from: 'profile' },
} as const satisfies Href;

/** Edit my profile. role: who is signed in (K12). */
export function ProfileEditScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const notice = useNotice();
  const { from } = useLocalSearchParams<{ from?: string }>();
  // Back alone would land on a tab, not where Edit profile was opened: reopen the profile modal then.
  const close = () => {
    router.back();
    if (from === EDIT_FROM_PROFILE.params.from) router.navigate('/profile');
  };
  const start = getProfileEdit(role);
  const [full, setFull] = useState(start.full);
  const [nickname, setNickname] = useState<string>(start.nickname);
  const [title, setTitle] = useState<string>(start.title);
  const [division, setDivision] = useState<string>(start.division);
  const [missing, setMissing] = useState(false);
  const save = () => {
    const blank = !full.trim();
    setMissing(blank);
    if (blank) return;
    notice(P.saved);
    close();
  };
  const foot = (
    <>
      <Button size="lg" variant="outline" className="flex-1" onPress={close}>
        <ButtonText>{P.cancel}</ButtonText>
      </Button>
      <Button size="lg" className="flex-1" onPress={save}>
        <ButtonText>{P.save}</ButtonText>
      </Button>
    </>
  );
  return (
    <DetailPage testID="screen-profile-edit" title={P.title} foot={foot}>
      <VStack className="items-center gap-2">
        <PersonAvatar name={start.full} size="xl" />
        <Button size="sm" variant="ghost" onPress={() => notice(P.changePhotoNotice)}>
          <ButtonText>{P.changePhoto}</ButtonText>
        </Button>
      </VStack>
      <Field
        label={P.full}
        required
        value={full}
        onChangeText={setFull}
        error={missing ? P.fullMissing : undefined}
      />
      <Field label={P.nickname} value={nickname} onChangeText={setNickname} />
      <Field label={P.job} value={title} onChangeText={setTitle} />
      <Field label={P.division} value={division} onChangeText={setDivision} />
      <Field label={P.role} value={start.role} hint={P.roleHint} readOnly />
      <Field label={P.email} value={start.email} hint={P.emailHint} readOnly />
    </DetailPage>
  );
}
