import { Button, Group, Modal, Paper, Stack, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { formatCalendarDate } from '~/components/ui/DateText';
import { notify } from '~/components/ui/notify';

type Leave = { start: string; end: string };

/** "Cuti": request time off; teammates then see the person as away (dummy state, not saved yet). */
export function LeaveCard() {
  const [open, { open: show, close }] = useDisclosure(false);
  const [leave, setLeave] = useState<Leave | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const invalid = start !== null && end !== null && end < start;

  const submit = () => {
    if (!start || !end || invalid) return;
    setLeave({ start, end });
    close();
    notify.success('Cuti diajukan. Rekan akan melihat Anda sedang cuti pada tanggal itu.');
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" wrap="wrap" gap="md">
        <div style={{ minWidth: 0 }}>
          <Text fw={700}>Cuti</Text>
          <Text size="sm" c="dimmed">
            {leave
              ? `Cuti diajukan ${formatCalendarDate(leave.start)} – ${formatCalendarDate(leave.end)}.`
              : 'Tidak sedang cuti. Rekan melihat Anda sebagai Tersedia.'}
          </Text>
        </div>
        <Button variant="default" onClick={show}>
          Ajukan cuti
        </Button>
      </Group>
      <Modal opened={open} onClose={close} title="Ajukan cuti">
        <Stack gap="sm">
          <DateInput
            label="Mulai"
            valueFormat="D MMMM YYYY"
            value={start}
            onChange={setStart}
            clearable
          />
          <DateInput
            label="Selesai"
            valueFormat="D MMMM YYYY"
            value={end}
            onChange={setEnd}
            minDate={start ?? undefined}
            error={invalid ? 'Tanggal selesai tidak boleh sebelum tanggal mulai.' : undefined}
            clearable
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={close}>
              Batal
            </Button>
            <Button onClick={submit} disabled={!start || !end || invalid}>
              Ajukan cuti
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
