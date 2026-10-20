/** Pengaturan tim: the switch "Cuti perlu persetujuan", saved the moment it is flipped (Admin only; the loader decides). */
import { Group, Loader, Paper, Stack, Switch, Text } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { notify } from '~/components/ui/notify';
import { putLeaveSwitch } from '~/lib/leave-api';
import { LEAVE_SWITCH_COPY } from './leave.copy';

/** Optimistic like the notification switches: the screen flips first, a failure puts it back and says so. */
export function LeaveTeamSwitch({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const { revalidate } = useRevalidator();
  const save = useMutation({
    mutationFn: (next: boolean) => putLeaveSwitch(next),
    onMutate: (next) => {
      const before = on;
      setOn(next);
      return { before };
    },
    onSuccess: ({ requiresApproval }) => {
      setOn(requiresApproval);
      notify.success(requiresApproval ? LEAVE_SWITCH_COPY.savedOn : LEAVE_SWITCH_COPY.savedOff);
      // The form's button label ("Kirim pengajuan" / "Simpan cuti") follows this switch.
      void revalidate();
    },
    onError: (err, _next, ctx) => {
      if (ctx) setOn(ctx.before);
      notify.fail(LEAVE_SWITCH_COPY.failed, err);
    },
  });

  return (
    <Paper withBorder radius="md" p={{ base: 'md', md: 'lg' }}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
        <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
          <Text fw={700}>{LEAVE_SWITCH_COPY.label}</Text>
          <Text size="sm" c="dimmed">
            {LEAVE_SWITCH_COPY.hint}
          </Text>
        </Stack>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text size="sm" fw={600}>
            {on ? LEAVE_SWITCH_COPY.on : LEAVE_SWITCH_COPY.off}
          </Text>
          <Switch
            aria-label={LEAVE_SWITCH_COPY.label}
            checked={on}
            disabled={save.isPending}
            thumbIcon={save.isPending ? <Loader size="0.6em" color="gray" /> : undefined}
            onChange={(e) => save.mutate(e.currentTarget.checked)}
          />
        </Group>
      </Group>
    </Paper>
  );
}
