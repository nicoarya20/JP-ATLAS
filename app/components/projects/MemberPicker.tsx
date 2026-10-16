/** Members of a new project: search people (name + job title only, Q8), give each a role, remove before saving. */
import { ActionIcon, Group, Paper, Select, Stack, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { PROJECT_MEMBER_ROLES, type ProjectMemberRole } from '@server/pm/enums';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import { isPickerMissing, type PickerPerson, searchPeople } from '~/lib/projects-api';
import { MEMBER_ROLE_LABELS, PICKER_COPY } from './projects.copy';

export type PickedMember = PickerPerson & { role: ProjectMemberRole };

const SEARCH_DEBOUNCE_MS = 300;
const ROLE_OPTIONS = PROJECT_MEMBER_ROLES.map((r) => ({ value: r, label: MEMBER_ROLE_LABELS[r] }));

type Props = {
  value: PickedMember[];
  onChange: (next: PickedMember[]) => void;
  /** The creator: always a manager, listed first and never pickable again. */
  creator: { id: string; name: string };
};

function PersonLine({ name, jobTitle, image }: Pick<PickerPerson, 'name' | 'jobTitle' | 'image'>) {
  return (
    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
      <MemberAvatar name={name} image={image} />
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="sm" fw={500} truncate>
          {name}
        </Text>
        {jobTitle && (
          <Text size="xs" c="dimmed" truncate>
            {jobTitle}
          </Text>
        )}
      </Stack>
    </Group>
  );
}

export function MemberPicker({ value, onChange, creator }: Props) {
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const people = useQuery({
    queryKey: ['team', 'picker', q],
    queryFn: () => searchPeople(q),
    retry: (count, err) => !isPickerMissing(err) && count < 2,
  });
  const taken = new Set([creator.id, ...value.map((m) => m.id)]);
  const options = (people.data ?? []).filter((p) => !taken.has(p.id));
  const add = (id: string | null) => {
    const person = options.find((p) => p.id === id);
    if (person) onChange([...value, { ...person, role: 'member' }]);
    setSearch('');
  };
  const setRole = (id: string, role: ProjectMemberRole) =>
    onChange(value.map((m) => (m.id === id ? { ...m, role } : m)));

  return (
    <Stack gap="xs">
      <div>
        <Text size="sm" fw={500}>
          {PICKER_COPY.label}
        </Text>
        <Text size="xs" c="dimmed">
          {PICKER_COPY.hint}
        </Text>
      </div>
      <Paper withBorder p="sm" radius="md">
        <Group justify="space-between" gap="xs" wrap="wrap">
          <PersonLine name={`${creator.name} ${PICKER_COPY.you}`} jobTitle={null} image={null} />
          <Text size="sm">{MEMBER_ROLE_LABELS.manager}</Text>
        </Group>
      </Paper>
      {value.map((m) => (
        <Paper key={m.id} withBorder p="sm" radius="md">
          <Group justify="space-between" gap="xs" wrap="wrap">
            <PersonLine {...m} />
            <Group gap="xs" wrap="nowrap">
              <Select
                aria-label={PICKER_COPY.roleOf(m.name)}
                data={ROLE_OPTIONS}
                value={m.role}
                allowDeselect={false}
                onChange={(r) => r && setRole(m.id, r as ProjectMemberRole)}
                w="10rem"
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={PICKER_COPY.remove(m.name)}
                onClick={() => onChange(value.filter((x) => x.id !== m.id))}
              >
                <FiX size="1.25em" aria-hidden />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
      ))}
      {people.isError && isPickerMissing(people.error) ? (
        <Text size="sm" c="dimmed">
          {PICKER_COPY.unavailable}
        </Text>
      ) : (
        <Select
          label={PICKER_COPY.search}
          placeholder={PICKER_COPY.searchPlaceholder}
          leftSection={<FiSearch size="1.25em" aria-hidden />}
          searchable
          searchValue={search}
          onSearchChange={setSearch}
          // The server already searched; filtering again here would hide matches on job title.
          filter={({ options: all }) => all}
          data={options.map((p) => ({ value: p.id, label: p.name }))}
          value={null}
          onChange={add}
          nothingFoundMessage={search.trim() ? PICKER_COPY.nothingFound : undefined}
          error={people.isError ? PICKER_COPY.failed : undefined}
        />
      )}
    </Stack>
  );
}
