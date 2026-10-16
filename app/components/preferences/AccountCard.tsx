import { Avatar, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { AppUser } from '~/lib/app-context';

// DUMMY: jabatan dan nomor HP contoh; profil saat ini belum punya kolom ini.
const DUMMY_TITLE = 'Pengembang · Divisi Produk';
const DUMMY_PHONE = 'HP 0813-2222-1010';

/** "Akun saya": who is signed in, with a shortcut to the full profile form below. */
export function AccountCard({ user }: { user: AppUser }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" wrap="wrap" gap="md">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <Avatar
            src={user.image}
            name={user.name}
            color="initials"
            radius="xl"
            size={72}
            imageProps={{ referrerPolicy: 'no-referrer' }}
          />
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Title order={4}>{user.name}</Title>
            <Text size="sm">{DUMMY_TITLE}</Text>
            <Text size="xs" c="dimmed">{`${DUMMY_PHONE} · ${user.email}`}</Text>
          </Stack>
        </Group>
        <Button component="a" href="#profil" variant="default">
          Ubah profil
        </Button>
      </Group>
    </Paper>
  );
}
