import { Group, Select, Text, TextInput } from '@mantine/core';
import { requireUser } from '@server/guard';
import { useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { TeamList } from '~/components/team/TeamList';
import { TEAM_PROJECTS } from '~/components/team/team.dummy';
import { filterTeam } from '~/components/team/team.filter';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/team';

export function meta() {
  return [{ title: 'Tim — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Team page with hardcoded dummy data (team.dummy.ts): who is in each project and who is free. */
export default function TeamPage() {
  const [project, setProject] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const rows = useMemo(() => filterTeam(TEAM_PROJECTS, project, q), [project, q]);

  return (
    <PageContainer>
      <PageHeader title="Tim" description="Siapa saja di tim Anda dan sedang mengerjakan apa" />
      <Group gap="sm" wrap="wrap">
        <Select
          aria-label="Pilih proyek"
          placeholder="Semua proyek"
          data={TEAM_PROJECTS.map((p) => p.name)}
          value={project}
          onChange={setProject}
          clearable
          w={{ base: '100%', sm: 220 }}
        />
        <TextInput
          style={{ flex: '1 1 220px' }}
          placeholder="Cari nama..."
          aria-label="Cari anggota"
          leftSection={<FiSearch size="1.25em" aria-hidden />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
      </Group>
      <TeamList projects={rows} />
      <Text size="xs" c="dimmed">
        Jumlah tugas per orang hanya terlihat oleh orang itu sendiri, Pengelola proyek, dan Admin.
      </Text>
    </PageContainer>
  );
}
