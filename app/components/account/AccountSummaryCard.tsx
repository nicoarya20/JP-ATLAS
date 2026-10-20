import { Avatar, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { Link } from 'react-router';
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
    <Paper withBorder radius="md" p={{ base: 'md', md: 'lg' }}>
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <Avatar
            src={image}
            radius="xl"
            size={64}
            name={name}
            color="initials"
            imageProps={{ referrerPolicy: 'no-referrer' }}
          />
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={700} style={{ overflowWrap: 'anywhere' }}>
              {name}
            </Text>
            <Text size="sm" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
              {role || ACCOUNT_COPY.noJobTitle}
            </Text>
            <Text size="sm" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
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
