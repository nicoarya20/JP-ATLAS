import { Divider, Group, Paper, Stack, Switch, Text } from '@mantine/core';
import { useState } from 'react';
import { notify } from '~/components/ui/notify';

type Pref = { key: string; title: string; hint: string };
const PREFS: Pref[] = [
  { key: 'reminder', title: 'Pengingat acara', hint: '1 hari dan 30 menit sebelum acara dimulai' },
  {
    key: 'news',
    title: 'Kabar terbaru di Inbox',
    hint: 'Komentar, perubahan tugas, dan undangan acara',
  },
];

/** "Pemberitahuan": two switches (local state for now); requests needing a reply cannot be muted. */
export function NotificationsCard() {
  const [on, setOn] = useState<Record<string, boolean>>({ reminder: true, news: true });

  const toggle = (p: Pref, value: boolean) => {
    setOn((s) => ({ ...s, [p.key]: value }));
    notify.success(`${p.title} ${value ? 'dihidupkan' : 'dimatikan'}.`);
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        {PREFS.map((p, i) => (
          <div key={p.key}>
            {i > 0 && <Divider mb="sm" />}
            <Group justify="space-between" wrap="nowrap" gap="md">
              <div style={{ minWidth: 0 }}>
                <Text fw={700}>{p.title}</Text>
                <Text size="sm" c="dimmed">
                  {p.hint}
                </Text>
              </div>
              <Switch
                size="md"
                checked={on[p.key]}
                onChange={(e) => toggle(p, e.currentTarget.checked)}
                label={on[p.key] ? 'Hidup' : 'Mati'}
                labelPosition="left"
                aria-label={p.title}
              />
            </Group>
          </div>
        ))}
        <Text size="sm" c="dimmed">
          Permintaan yang perlu Anda tanggapi selalu muncul di Inbox dan tidak bisa dimatikan.
        </Text>
      </Stack>
    </Paper>
  );
}
