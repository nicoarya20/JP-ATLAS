/** "Pakai template" instantiate form (plan §5.1): start date (the offset baseline), optional overrides. */
import { Button, Group, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import type { IsoDate } from '@server/metrics/types';
import { PROJECT_PRIORITIES } from '@server/pm/enums';
import { PROJECT_NAME_MAX } from '@server/project/project.limits';
import { useState } from 'react';
import { MemberPicker, type PickedMember } from '~/components/projects/MemberPicker';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import type { TemplateListItem, UseTemplateInput } from '~/lib/project-templates-api';
import { TEMPLATE_COPY as COPY } from './template-create.copy';

const DATE_FORMAT = 'D MMMM YYYY';
const PRIORITY_OPTIONS = PROJECT_PRIORITIES.map((p) => ({
  value: p,
  label: PRIORITY_LABELS[p].label,
}));

type Props = {
  template: TemplateListItem;
  today: IsoDate;
  creator: { id: string; name: string };
  submitting: boolean;
  onSubmit: (input: UseTemplateInput) => void;
  onCancel: () => void;
};

export function TemplateUseForm({
  template,
  today,
  creator,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<string | null>(today);
  const [priority, setPriority] = useState<(typeof PROJECT_PRIORITIES)[number] | null>(null);
  const [members, setMembers] = useState<PickedMember[]>([]);

  const submit = () => {
    if (!startDate) return;
    onSubmit({
      ...(name.trim() ? { name: name.trim() } : {}),
      startDate,
      ...(priority ? { priority } : {}),
      members: members.map((m) => ({ userId: m.id, role: m.role })),
    });
  };

  return (
    <Stack gap="md">
      <Text fw={600}>{COPY.useFormTitle(template.name)}</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <DateInput
          label={COPY.startDateLabel}
          description={COPY.startDateHint}
          valueFormat={DATE_FORMAT}
          withAsterisk
          value={startDate}
          onChange={(v) => setStartDate(v)}
        />
        <Select
          label="Prioritas"
          data={PRIORITY_OPTIONS}
          clearable
          value={priority}
          onChange={(v) => setPriority(v as typeof priority)}
        />
      </SimpleGrid>
      <TextInput
        label={COPY.nameOverrideLabel}
        maxLength={PROJECT_NAME_MAX}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      <MemberPicker value={members} onChange={setMembers} creator={creator} />
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={onCancel} disabled={submitting}>
          {COPY.cancel}
        </Button>
        <Button onClick={submit} loading={submitting} disabled={!startDate}>
          {COPY.useSubmit}
        </Button>
      </Group>
    </Stack>
  );
}
