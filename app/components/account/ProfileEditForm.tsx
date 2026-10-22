import { Anchor, Button, Group, SimpleGrid, Stack, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  isPhoneFormat,
  PHONE_FORMAT_ERROR,
  PROFILE_DEPARTMENT_MAX,
  PROFILE_NAME_MAX,
  PROFILE_NICKNAME_MAX,
  PROFILE_PHONE_MAX,
  PROFILE_TITLE_MAX,
} from '@server/profile/profile.rules';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router';
import { notify } from '~/components/ui/notify';
import { type MyProfile, patchMyProfile } from '~/lib/profile-api';
import { AvatarField } from '../profile/AvatarField';
import { PROFILE_FORM_COPY as COPY } from './account.copy';

/** Where Batal, Simpan and the back link return to. */
export const SETTINGS_PATH = '/app/settings';

type FieldKey = 'displayName' | 'nickname' | 'jobTitle' | 'department' | 'phone';
type Fields = Record<FieldKey, string>;

const MAX: Record<FieldKey, number> = {
  displayName: PROFILE_NAME_MAX,
  nickname: PROFILE_NICKNAME_MAX,
  jobTitle: PROFILE_TITLE_MAX,
  department: PROFILE_DEPARTMENT_MAX,
  phone: PROFILE_PHONE_MAX,
};

const toFields = (p: MyProfile): Fields => ({
  displayName: p.displayName ?? '',
  nickname: p.nickname ?? '',
  jobTitle: p.jobTitle ?? '',
  department: p.department ?? '',
  phone: p.phone ?? '',
});

/** The "Ubah profil" screen: photo, six fields in two columns (email read-only), Batal and Simpan. */
export function ProfileEditForm({
  profile,
  image,
  onPhotoChanged,
}: {
  profile: MyProfile;
  image: string | null;
  /** Refetch after a photo upload/removal; the text fields keep what was typed. */
  onPhotoChanged: () => void;
}) {
  const navigate = useNavigate();
  const initial = toFields(profile);
  const [form, setForm] = useState<Fields>(initial);
  const keys = Object.keys(initial) as FieldKey[];
  const dirty = keys.some((k) => form[k].trim() !== initial[k]);
  const phoneError = isPhoneFormat(form.phone) ? null : PHONE_FORMAT_ERROR;
  const save = useMutation({
    // Blank fields are sent as '' and stored as NULL by the server (it trims and clears).
    mutationFn: () => patchMyProfile(form),
    onSuccess: () => {
      notifications.show({ color: 'teal', message: COPY.saved });
      navigate(SETTINGS_PATH);
    },
    onError: (err) => notify.fail(COPY.saveFailed, err),
  });

  const field = (key: FieldKey) => ({
    value: form[key],
    maxLength: MAX[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: e.currentTarget.value }),
  });

  return (
    <Stack gap="md">
      <div>
        <Anchor
          component={Link}
          to={SETTINGS_PATH}
          size="sm"
          display="inline-flex"
          style={{ alignItems: 'center', gap: 'var(--mantine-spacing-xs)' }}
        >
          <FiArrowLeft size="1.25em" aria-hidden />
          {COPY.back}
        </Anchor>
        <Title order={2}>{COPY.title}</Title>
      </div>
      <AvatarField
        image={image}
        name={form.displayName.trim() || profile.name}
        onChanged={onPhotoChanged}
        uploadLabel={COPY.changePhoto}
      />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <TextInput
          label={COPY.name}
          description={COPY.nameHint}
          placeholder={profile.name}
          autoComplete="name"
          {...field('displayName')}
        />
        <TextInput
          label={COPY.nickname}
          description={COPY.nicknameHint}
          autoComplete="nickname"
          {...field('nickname')}
        />
        <TextInput label={COPY.jobTitle} autoComplete="organization-title" {...field('jobTitle')} />
        <TextInput label={COPY.department} {...field('department')} />
        <TextInput
          label={COPY.phone}
          description={COPY.phoneHint}
          error={phoneError}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          {...field('phone')}
        />
        <TextInput
          label={COPY.email}
          description={COPY.emailHint}
          value={profile.email}
          readOnly
          variant="filled"
        />
      </SimpleGrid>
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Button component={Link} to={SETTINGS_PATH} variant="default" fw={700}>
          {COPY.cancel}
        </Button>
        <Button
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!dirty || phoneError !== null}
        >
          {COPY.save}
        </Button>
      </Group>
    </Stack>
  );
}
