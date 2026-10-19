/**
 * The event form as drawn: stage 1 (judul, waktu, lokasi, peserta) always, stage 2 behind
 * "Tambahkan rincian", then Batal and Simpan. It holds no state of its own so a test can render any
 * moment of the form; `EventForm` owns the values, the stage, the request and the redirect.
 */
import { Alert, Box, Button, Group, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { DateInput, TimeInput } from '@mantine/dates';
import type { UseFormReturnType } from '@mantine/form';
import { EVENT_LOCATION_TEXT_MAX, EVENT_TITLE_MAX } from '@server/event/events.dto';
import { FiAlertCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { Link } from 'react-router';
import {
  DEFAULT_DURATION_MINUTES,
  type EventFormValues,
  type ProjectOption,
} from '~/lib/event-form';
import { EVENT_FORM_COPY as COPY } from '~/lib/event-form.copy';
import { addMinutes } from '~/lib/events-time';
import { EventFormDetails } from './EventFormDetails';
import { ParticipantPicker } from './ParticipantPicker';

export const EVENT_DATE_FORMAT = 'D MMMM YYYY';
/** Marks the four fields of stage 1, so a test (and a reader) can count exactly what opens first. */
const field = (name: string) => ({ 'data-event-field': name });

type Props = {
  form: UseFormReturnType<EventFormValues>;
  projects: readonly ProjectOption[];
  /** Whether stage 2 is open. */
  more: boolean;
  onToggleMore: () => void;
  saving: boolean;
  /** The sentence for a refused save; field messages sit on their own fields. */
  serverError: string | null;
  cancelTo: string;
  /** Called by the native submit; `EventForm` passes `form.onSubmit(...)`. */
  onSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
};

export function EventFormView({
  form,
  projects,
  more,
  onToggleMore,
  saving,
  serverError,
  cancelTo,
  onSubmit,
}: Props) {
  const startProps = form.getInputProps('startTime');
  // Picking the start time fills an empty end time an hour later, so most events need one tap less.
  const onStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    startProps.onChange(e);
    if (form.values.endTime === '') {
      const end = addMinutes(e.currentTarget.value, DEFAULT_DURATION_MINUTES);
      if (end) form.setFieldValue('endTime', end);
    }
  };
  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <TextInput
          label={COPY.title}
          placeholder={COPY.titlePlaceholder}
          withAsterisk
          maxLength={EVENT_TITLE_MAX}
          wrapperProps={field('title')}
          {...form.getInputProps('title')}
        />
        <Stack gap="md" {...field('when')}>
          <DateInput
            label={COPY.date}
            placeholder={COPY.datePlaceholder}
            valueFormat={EVENT_DATE_FORMAT}
            withAsterisk
            {...form.getInputProps('date')}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TimeInput label={COPY.startTime} withAsterisk {...startProps} onChange={onStart} />
            <TimeInput label={COPY.endTime} withAsterisk {...form.getInputProps('endTime')} />
          </SimpleGrid>
        </Stack>
        <TextInput
          label={COPY.location}
          description={COPY.locationHint}
          placeholder={COPY.locationPlaceholder}
          maxLength={EVENT_LOCATION_TEXT_MAX}
          wrapperProps={field('location')}
          {...form.getInputProps('location')}
        />
        <ParticipantPicker
          value={form.values.participantIds}
          onChange={(ids) => form.setFieldValue('participantIds', ids)}
          projectId={form.values.projectId}
          error={form.errors.participantIds as string | undefined}
          wrapperProps={field('participants')}
        />
        {more ? (
          <EventFormDetails form={form} projects={projects} />
        ) : (
          <Text size="sm" c="dimmed">
            {COPY.autoDefaults}
          </Text>
        )}
        <Box>
          <Button
            variant="subtle"
            data-testid="event-more-toggle"
            aria-expanded={more}
            aria-controls="event-form-details"
            onClick={onToggleMore}
            leftSection={
              more ? (
                <FiChevronUp size="1.25em" aria-hidden />
              ) : (
                <FiChevronDown size="1.25em" aria-hidden />
              )
            }
          >
            {more ? COPY.hideMore : COPY.showMore}
          </Button>
        </Box>
        {serverError && (
          <Alert color="danger" role="alert" icon={<FiAlertCircle size="1.25em" aria-hidden />}>
            {serverError}
          </Alert>
        )}
        <Group justify="flex-end" gap="xs" wrap="wrap">
          <Button component={Link} to={cancelTo} variant="default">
            {COPY.cancel}
          </Button>
          <Button type="submit" loading={saving}>
            {COPY.save}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
