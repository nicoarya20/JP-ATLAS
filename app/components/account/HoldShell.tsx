import { Button, Container, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { type ReactNode, useState } from 'react';
import { FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { signOut } from '~/lib/auth-client';

type HoldShellProps = {
  icon: ReactNode;
  color: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Button row under the content (wraps on narrow screens). */
  actions?: ReactNode;
};

/** Shared card frame for pages shown to a signed-in account that may not proceed (/waiting, /banned). */
export function HoldShell({ icon, color, title, subtitle, children, actions }: HoldShellProps) {
  return (
    <Container size="xs" py={{ base: 32, sm: 64 }} px={{ base: 'sm', sm: 'md' }}>
      <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="md" shadow="sm">
        <Stack gap="md">
          <Group gap="md" wrap="nowrap" align="flex-start">
            <ThemeIcon
              size={56}
              radius="md"
              variant="light"
              color={color}
              style={{ flexShrink: 0 }}
            >
              {icon}
            </ThemeIcon>
            <div style={{ minWidth: 0 }}>
              <Title order={2} lh={1.2}>
                {title}
              </Title>
              {subtitle && (
                <Text size="sm" c="dimmed" mt={4} style={{ overflowWrap: 'anywhere' }}>
                  {subtitle}
                </Text>
              )}
            </div>
          </Group>
          {children}
          {actions && (
            <Group gap="xs" wrap="wrap">
              {actions}
            </Group>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}

/** "Keluar" button that asks for confirmation, signs out and goes to /login; shows loading meanwhile. */
export function HoldLeaveButton({ label = 'Keluar dari akun ini' }: { label?: string }) {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const leave = async () => {
    setLeaving(true);
    try {
      await signOut();
      navigate('/login');
    } catch {
      // Stay on the page: the session is still valid, so the user can retry.
      setLeaving(false);
      notifications.show({ color: 'red', message: 'Gagal keluar. Coba lagi.' });
    }
  };
  const confirm = () =>
    modals.openConfirmModal({
      title: 'Keluar dari akun ini?',
      children: (
        <Text size="sm">Anda akan keluar dari akun ini. Anda bisa masuk lagi kapan saja.</Text>
      ),
      labels: { confirm: 'Keluar', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: leave,
    });
  return (
    <Button
      size="sm"
      color="red"
      variant="light"
      leftSection={<FiLogOut size={14} />}
      loading={leaving}
      onClick={confirm}
    >
      {label}
    </Button>
  );
}
