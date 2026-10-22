/** "Tambah anggota": search approved people (name + job title only, Q8), pick a role, add. */
import { Button, Group, Modal, Select, Stack } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { PROJECT_MEMBER_ROLES, type ProjectMemberRole } from '@server/pm/enums';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { type PickerPerson, searchPeople } from '~/lib/projects-api';
import { ADD_MODAL_COPY, MEMBER_ROLE_HINTS } from './members.copy';
import { MEMBER_ROLE_LABELS } from './projects.copy';

const SEARCH_DEBOUNCE_MS = 300;
const ROLE_OPTIONS = PROJECT_MEMBER_ROLES.map((r) => {
  const hint = MEMBER_ROLE_HINTS[r];
  return { value: r, label: hint ? `${MEMBER_ROLE_LABELS[r]} (${hint})` : MEMBER_ROLE_LABELS[r] };
});

type Props = {
  projectId: string;
  opened: boolean;
  loading: boolean;
  onClose: () => void;
  /** Resolves true when the person was added, so the modal can close and reset. */
  onAdd: (person: PickerPerson, role: ProjectMemberRole) => Promise<boolean>;
};

export function AddMemberModal({ projectId, opened, loading, onClose, onAdd }: Props) {
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [person, setPerson] = useState<PickerPerson | null>(null);
  const [role, setRole] = useState<ProjectMemberRole>('member');
  const [touched, setTouched] = useState(false);
  // The server leaves current members out when `projectId` is given.
  const people = useQuery({
    queryKey: ['team', 'picker', projectId, q],
    queryFn: () => searchPeople(q, { projectId }),
    enabled: opened,
  });
  const options = people.data ?? [];
  const close = () => {
    setSearch('');
    setPerson(null);
    setRole('member');
    setTouched(false);
    onClose();
  };
  const submit = async () => {
    setTouched(true);
    if (person && (await onAdd(person, role))) close();
  };

  return (
    <Modal opened={opened} onClose={close} title={ADD_MODAL_COPY.title}>
      <Stack gap="md">
        <Select
          label={ADD_MODAL_COPY.person}
          placeholder={ADD_MODAL_COPY.personPlaceholder}
          leftSection={<FiSearch size="1.25em" aria-hidden />}
          withAsterisk
          searchable
          searchValue={search}
          onSearchChange={setSearch}
          // The server already searched; filtering again here would hide matches on job title.
          filter={({ options: all }) => all}
          data={options.map((p) => ({
            value: p.id,
            label: p.jobTitle ? `${p.name} · ${p.jobTitle}` : p.name,
          }))}
          value={person?.id ?? null}
          onChange={(id) => setPerson(options.find((p) => p.id === id) ?? null)}
          nothingFoundMessage={search.trim() ? ADD_MODAL_COPY.nothingFound : undefined}
          error={
            people.isError
              ? ADD_MODAL_COPY.searchFailed
              : touched && !person
                ? ADD_MODAL_COPY.personRequired
                : undefined
          }
        />
        <Select
          label={ADD_MODAL_COPY.role}
          data={ROLE_OPTIONS}
          value={role}
          allowDeselect={false}
          onChange={(r) => r && setRole(r as ProjectMemberRole)}
        />
        <Group justify="flex-end" gap="xs" wrap="wrap">
          <Button variant="default" onClick={close}>
            {ADD_MODAL_COPY.cancel}
          </Button>
          <Button onClick={submit} loading={loading}>
            {ADD_MODAL_COPY.submit}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
