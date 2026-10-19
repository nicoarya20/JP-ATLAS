import { Button, Group, Select, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { fakeLatency } from '~/lib/dummy-latency';
import { PEOPLE_COPY as P } from './project-people.copy';
import { PEOPLE, type ProjectRole, ROLE_LABELS } from './projects.detail.dummy';

type Props = {
  /** Names already on the project; they are not offered again. */
  taken: readonly string[];
  onSubmit: (name: string, role: ProjectRole) => void;
  onClose: () => void;
};

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as ProjectRole[]).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

/** The "Tambah anggota" dialog (flow ⑩): who, and in what role. */
export function AddMemberForm({ taken, onSubmit, onClose }: Props) {
  const options = PEOPLE.filter((p) => !taken.includes(p.name)).map((p) => ({
    value: p.name,
    label: `${p.name} · ${p.jobTitle}`,
  }));
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<ProjectRole>('member');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  if (options.length === 0) {
    return (
      <Stack gap="md">
        <Text size="sm">{P.nobody}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {P.cancel}
          </Button>
        </Group>
      </Stack>
    );
  }
  async function submit() {
    if (!name) return setError(P.pickRequired);
    setLoading(true);
    await fakeLatency();
    onSubmit(name, role);
  }
  return (
    <Stack gap="md">
      <Select
        label={P.pick}
        data={options}
        value={name}
        error={error}
        searchable
        required
        onChange={(v) => {
          setName(v);
          setError(undefined);
        }}
      />
      <Select
        label={P.pickRole}
        data={ROLE_OPTIONS}
        value={role}
        allowDeselect={false}
        onChange={(v) => v && setRole(v as ProjectRole)}
      />
      <Group justify="flex-end" wrap="wrap">
        <Button variant="default" onClick={onClose} disabled={loading}>
          {P.cancel}
        </Button>
        <Button loading={loading} onClick={() => void submit()}>
          {P.addSubmit}
        </Button>
      </Group>
    </Stack>
  );
}
