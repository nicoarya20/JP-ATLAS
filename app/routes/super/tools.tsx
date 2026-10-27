import { Stack } from '@mantine/core';
import { requireRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { useQuery } from '@tanstack/react-query';
import { McpCard } from '~/components/tools/McpCard';
import { ApiCard, ResetCard, StatusCard } from '~/components/tools/OpsCards';
import { PageHeader } from '~/components/ui/PageHeader';
import { fetchMcpInfo, fetchOpsStatus, fetchResetTargets } from '~/lib/ops-api';
import type { Route } from './+types/tools';

export function meta() {
  return [{ title: 'Tools — Simple PM Dev' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, ROLES.SUPER_ADMIN);
  return null;
}

export default function ToolsPage() {
  const status = useQuery({
    queryKey: ['ops-status'],
    queryFn: fetchOpsStatus,
    refetchInterval: 15_000,
  });
  const mcp = useQuery({ queryKey: ['ops-mcp'], queryFn: fetchMcpInfo });
  const targets = useQuery({ queryKey: ['ops-reset-targets'], queryFn: fetchResetTargets });
  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }} maw={960}>
      <PageHeader
        title="Tools & MCP"
        description="Akses untuk agent AI, ringkasan API, status proses, dan reset state untuk debugging."
      />
      <StatusCard
        status={status.data}
        onRefresh={() => status.refetch()}
        refreshing={status.isFetching}
      />
      <McpCard info={mcp.data} />
      <ApiCard />
      <ResetCard targets={targets.data} />
    </Stack>
  );
}
