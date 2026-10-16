import { Button, Group, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { notifyError } from '~/lib/notify';
import { type MyProfile, type MyProfilePatch, patchMyProfile } from '~/lib/profile-api';
import { AvatarField } from '../profile/AvatarField';
import { SettingsCard } from '../settings/SettingsParts';
import { ACCOUNT_COPY } from './account.copy';

type Fields = Required<Pick<MyProfilePatch, 'displayName' | 'jobTitle' | 'department' | 'phone'>>;
type FieldKey = keyof Fields;

// Mirrors PROFILE_*_MAX in server/profile/profile.service.ts; the server rejects anything longer.
const MAX: Record<FieldKey, number> = { displayName: 80, jobTitle: 80, department: 80, phone: 30 };

const toFields = (p: MyProfile): Record<FieldKey, string> => ({
  displayName: p.displayName ?? '',
  jobTitle: p.jobTitle ?? '',
  department: p.department ?? '',
  phone: p.phone ?? '',
});

/** Own profile: photo, name, job title, division, optional phone and the read-only email. */
export function AccountCard({
  profile,
  image,
  onSaved,
}: {
  profile: MyProfile;
  image: string | null;
  onSaved: () => void;
}) {
  const initial = toFields(profile);
  const [form, setForm] = useState(initial);
  // Re-seed after a save or revalidation brings fresh server values.
  const { displayName, jobTitle, department, phone } = profile;
  useEffect(
    () =>
      setForm({
        displayName: displayName ?? '',
        jobTitle: jobTitle ?? '',
        department: department ?? '',
        phone: phone ?? '',
      }),
    [displayName, jobTitle, department, phone],
  );

  const keys = Object.keys(initial) as FieldKey[];
  const dirty = keys.some((k) => form[k].trim() !== initial[k]);
  const save = useMutation({
    // Blank fields are sent as '' and stored as NULL by the server (it trims and clears).
    mutationFn: () => patchMyProfile(form),
    onSuccess: () => {
      notifications.show({ color: 'teal', message: ACCOUNT_COPY.saved });
      onSaved();
    },
    onError: (err) => notifyError(ACCOUNT_COPY.saveFailed, err),
  });

  const field = (key: FieldKey) => ({
    value: form[key],
    maxLength: MAX[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: e.currentTarget.value }),
  });

  return (
    <SettingsCard title={ACCOUNT_COPY.title} description={ACCOUNT_COPY.description}>
      <Stack gap="md">
        <AvatarField
          image={image}
          name={form.displayName.trim() || profile.name}
          onChanged={onSaved}
        />
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <TextInput
            label={ACCOUNT_COPY.name}
            description={ACCOUNT_COPY.nameHint}
            placeholder={profile.name}
            autoComplete="name"
            {...field('displayName')}
          />
          <TextInput
            label={ACCOUNT_COPY.jobTitle}
            autoComplete="organization-title"
            {...field('jobTitle')}
          />
          <TextInput label={ACCOUNT_COPY.department} {...field('department')} />
          <TextInput
            label={ACCOUNT_COPY.phone}
            description={ACCOUNT_COPY.phoneHint}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...field('phone')}
          />
        </SimpleGrid>
        <TextInput
          label={ACCOUNT_COPY.email}
          description={ACCOUNT_COPY.emailHint}
          value={profile.email}
          readOnly
          variant="filled"
        />
      </Stack>
      <Group justify="flex-end" gap="xs" wrap="wrap">
        {dirty && (
          <Button variant="subtle" color="gray" onClick={() => setForm(initial)}>
            {ACCOUNT_COPY.reset}
          </Button>
        )}
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
          {ACCOUNT_COPY.save}
        </Button>
      </Group>
    </SettingsCard>
  );
}
