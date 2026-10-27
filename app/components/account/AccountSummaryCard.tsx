import { Avatar, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { Link } from 'react-router';
import { WRAP_ANYWHERE } from '~/components/pm/text-wrap';
import type { MyProfile } from '~/lib/profile-api';
import { ACCOUNT_COPY } from './account.copy';

/** "Akun saya": photo, name, job title · division, phone and email, with the way into "Ubah profil". */
export function AccountSummaryCard({
  profile,
  image,
}: {
  profile: MyProfile;
  image: string | null;
}) {
  const name = profile.displayName?.trim() || profile.name;
  const role = [profile.jobTitle, profile.department].filter(Boolean).join(' · ');
  const contact = [
    profile.phone ? `${ACCOUNT_COPY.phoneLabel} ${profile.phone}` : null,
    profile.email,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Paper withBorder p={{ base: 'md', md: 'lg' }}>
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Group gap="md" wrap="nowrap" miw={0} flex={1}>
          <Avatar
            src={image}
            radius="xl"
            size={64}
            name={name}
            color="initials"
            imageProps={{ referrerPolicy: 'no-referrer' }}
          />
          {/* The viewer's own identity: an email must wrap in full, never be cut short. */}
          <Stack gap={4} miw={0}>
            <Text fw={700} style={WRAP_ANYWHERE}>
              {name}
            </Text>
            <Text size="sm" c="dimmed" style={WRAP_ANYWHERE}>
              {role || ACCOUNT_COPY.noJobTitle}
            </Text>
            <Text size="sm" c="dimmed" style={WRAP_ANYWHERE}>
              {contact}
            </Text>
          </Stack>
        </Group>
        <Button component={Link} to="/app/settings/profile" variant="default" fw={700}>
          {ACCOUNT_COPY.edit}
        </Button>
      </Group>
    </Paper>
  );
}
