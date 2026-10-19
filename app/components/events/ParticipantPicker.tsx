import { Loader, MultiSelect, Stack, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { mergeSuggestions } from '~/lib/event-form';
import { EVENT_FORM_COPY as COPY } from '~/lib/event-form.copy';
import { eventKeys, fetchGuestCandidates, type GuestCandidate } from '~/lib/events-api';

/** Wait for a pause in typing before asking the server, so one name is one request. */
const SEARCH_DEBOUNCE_MS = 250;

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
  /** The project picked in stage 2: its people are listed first. */
  projectId: string | null;
  error?: string;
  wrapperProps?: Record<string, string>;
};

/** Guests by name: search colleagues, pick several; the creator is a guest without being picked. */
export function ParticipantPicker({ value, onChange, projectId, error, wrapperProps }: Props) {
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const everyone = useQuery({
    queryKey: eventKeys.people(q, null),
    queryFn: () => fetchGuestCandidates(q, null),
    placeholderData: keepPreviousData,
  });
  const ofProject = useQuery({
    queryKey: eventKeys.people(q, projectId),
    queryFn: () => fetchGuestCandidates(q, projectId),
    enabled: projectId !== null,
    placeholderData: keepPreviousData,
  });
  // A picked person must stay in `data` after the search moves on, or the chip would lose its name.
  const [picked, setPicked] = useState<Record<string, GuestCandidate>>({});

  const found = mergeSuggestions(projectId ? (ofProject.data ?? []) : [], everyone.data ?? []);
  const byId = new Map(found.map((p) => [p.id, p]));
  const people = (id: string): GuestCandidate =>
    byId.get(id) ?? picked[id] ?? { id, name: id, jobTitle: null };
  const options = [...new Map([...value.map(people), ...found].map((p) => [p.id, p])).values()];
  const failed = everyone.isError || (projectId !== null && ofProject.isError);

  return (
    <MultiSelect
      label={COPY.participants}
      description={COPY.participantsHint}
      placeholder={value.length === 0 ? COPY.participantsPlaceholder : undefined}
      size="lg"
      searchable
      clearable
      hidePickedOptions
      data={options.map((p) => ({ value: p.id, label: p.name }))}
      value={value}
      searchValue={search}
      onSearchChange={setSearch}
      onChange={(ids) => {
        setPicked((prev) => ({
          ...prev,
          ...Object.fromEntries(ids.map((id) => [id, people(id)])),
        }));
        onChange(ids);
      }}
      nothingFoundMessage={everyone.isFetching ? undefined : COPY.participantsNone}
      rightSection={everyone.isFetching ? <Loader size="xs" /> : undefined}
      renderOption={({ option }) => (
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="sm" truncate>
            {option.label}
          </Text>
          {byId.get(option.value)?.jobTitle && (
            <Text size="xs" c="dimmed" truncate>
              {byId.get(option.value)?.jobTitle}
            </Text>
          )}
        </Stack>
      )}
      error={error ?? (failed ? COPY.participantsLoadFailed : undefined)}
      wrapperProps={wrapperProps}
    />
  );
}
