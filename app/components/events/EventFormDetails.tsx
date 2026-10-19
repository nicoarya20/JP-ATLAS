/** Stage 2 of the event form ("Tambahkan rincian"): jenis, proyek, agenda, tautan rapat, pengingat. */
import { Checkbox, Group, Select, SimpleGrid, Stack, Textarea, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { EVENT_AGENDA_MAX, EVENT_MEETING_URL_MAX } from '@server/event/events.dto';
import { EVENT_KINDS, EVENT_REMINDER_OFFSETS_MIN } from '@server/pm/enums';
import type { EventFormValues, ProjectOption } from '~/lib/event-form';
import { EVENT_FORM_COPY as COPY } from '~/lib/event-form.copy';
import { EVENT_KIND_LABELS } from '~/lib/events-format';

const KIND_OPTIONS = EVENT_KINDS.map((k) => ({ value: k, label: EVENT_KIND_LABELS[k] }));

type Props = {
  form: UseFormReturnType<EventFormValues>;
  /** Projects the creator may attach an event to; a Pemantau's project is never in it. */
  projects: readonly ProjectOption[];
};

export function EventFormDetails({ form, projects }: Props) {
  const noProjects = projects.length === 0;
  return (
    <Stack gap="md" id="event-form-details" data-event-stage="details">
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Select
          label={COPY.kind}
          data={KIND_OPTIONS}
          allowDeselect={false}
          {...form.getInputProps('kind')}
        />
        <Select
          label={COPY.project}
          description={noProjects ? COPY.projectNone : COPY.projectHint}
          placeholder={COPY.projectPlaceholder}
          data={[...projects]}
          searchable
          clearable
          disabled={noProjects}
          {...form.getInputProps('projectId')}
        />
      </SimpleGrid>
      <TextInput
        label={COPY.meetingUrl}
        description={COPY.meetingUrlHint}
        placeholder={COPY.meetingUrlPlaceholder}
        inputMode="url"
        maxLength={EVENT_MEETING_URL_MAX}
        {...form.getInputProps('meetingUrl')}
      />
      <Textarea
        label={COPY.agenda}
        placeholder={COPY.agendaPlaceholder}
        autosize
        minRows={3}
        maxRows={10}
        maxLength={EVENT_AGENDA_MAX}
        {...form.getInputProps('agenda')}
      />
      <Checkbox.Group
        label={COPY.reminders}
        description={COPY.remindersHint}
        {...form.getInputProps('reminders')}
        value={form.values.reminders.map(String)}
        onChange={(picked) => form.setFieldValue('reminders', picked.map(Number))}
      >
        <Group mt="xs" gap="md" wrap="wrap">
          {EVENT_REMINDER_OFFSETS_MIN.map((minutes) => (
            <Checkbox key={minutes} value={String(minutes)} label={COPY.reminderLabel(minutes)} />
          ))}
        </Group>
      </Checkbox.Group>
    </Stack>
  );
}
