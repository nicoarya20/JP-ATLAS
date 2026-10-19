import { Button, Group, Select, Stack, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useState } from 'react';
import { fakeLatency } from '~/lib/dummy-latency';
import { DETAIL_COPY as C } from './project-detail.copy';
import {
  type ExtendErrors,
  earliestDue,
  reasonText,
  validateExtension,
} from './project-extend.logic';
import type { ProjectRecord } from './projects.logic';

type Props = {
  project: Pick<ProjectRecord, 'due'>;
  onSubmit: (due: string, reason: string) => void;
  onClose: () => void;
};

/** The "Perpanjang tenggat" dialog (flow ⑪): a later date and a reason, asked for together. */
export function ExtendDueForm({ project, onSubmit, onClose }: Props) {
  const [due, setDue] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<ExtendErrors>({});
  const [loading, setLoading] = useState(false);

  async function submit() {
    const found = validateExtension({ currentDue: project.due, due, category, note });
    setErrors(found);
    if (Object.keys(found).length > 0 || !due) return;
    setLoading(true);
    await fakeLatency();
    onSubmit(due, reasonText(category, note));
  }

  return (
    <Stack gap="md">
      <DateInput
        label={C.newDue}
        valueFormat="D MMMM YYYY"
        minDate={earliestDue(project.due)}
        value={due}
        error={errors.due}
        onChange={setDue}
        required
      />
      <Select
        label={C.reason}
        data={C.reasons.map((r) => ({ value: r.value, label: r.label }))}
        value={category}
        error={errors.category}
        onChange={setCategory}
        required
      />
      <Textarea
        label={C.note}
        autosize
        minRows={2}
        value={note}
        error={errors.note}
        onChange={(e) => setNote(e.currentTarget.value)}
      />
      <Group justify="flex-end" wrap="wrap">
        <Button variant="default" onClick={onClose} disabled={loading}>
          {C.cancel}
        </Button>
        <Button loading={loading} onClick={() => void submit()}>
          {C.extendSubmit}
        </Button>
      </Group>
    </Stack>
  );
}
