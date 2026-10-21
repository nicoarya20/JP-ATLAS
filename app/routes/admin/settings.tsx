import { Group, ScrollArea, Stack, Tabs, Text, Title } from '@mantine/core';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { useSearchParams } from 'react-router';
import { SETTINGS_PANELS } from '~/components/admin/settings/panels';
import {
  parseSettingsTab,
  SETTINGS_PAGE_COPY,
  SETTINGS_TABS,
} from '~/components/admin/settings/settings.tabs';
import { EmptyState } from '~/components/ui/EmptyState';
import type { Route } from './+types/settings';

export function meta() {
  return [{ title: 'Pengaturan — Simple PM' }];
}

/**
 * Shell of Setelan organisasi: the six tabs of P11 §4 that really are settings — AD-20 moved the
 * report (Peran & izin) and the tool (Ekspor data) out to menus of their own — each one rendering
 * its registered panel (`panels.tsx`) or, while none is registered, the placeholder from
 * `settings.tabs.ts`. The guard is repeated here on purpose — React Router runs the layout and
 * page loaders in parallel, so the layout guard does not cover this page's data.
 */
export async function loader({ request }: Route.LoaderArgs) {
  await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  return null;
}

/** Switching tab only changes `?tab=`, and no panel reads the loader, so skip the reload. */
export function shouldRevalidate({
  currentUrl,
  nextUrl,
}: {
  currentUrl: URL;
  nextUrl: URL;
}): boolean {
  return currentUrl.pathname !== nextUrl.pathname;
}

export default function AdminSettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = parseSettingsTab(params.get('tab'));

  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }}>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={1}>{SETTINGS_PAGE_COPY.title}</Title>
          <Text size="sm" c="dimmed">
            {SETTINGS_PAGE_COPY.description}
          </Text>
        </div>
      </Group>

      <Tabs
        value={tab}
        onChange={(v) =>
          setParams({ tab: parseSettingsTab(v) }, { replace: true, preventScrollReset: true })
        }
        keepMounted={false}
      >
        {/* Six tabs fit a laptop but never 375px, so the list scrolls sideways instead of overflowing. */}
        <ScrollArea type="hover" scrollbarSize={6} offsetScrollbars={false}>
          <Tabs.List style={{ flexWrap: 'nowrap' }} aria-label={SETTINGS_PAGE_COPY.tabsLabel}>
            {SETTINGS_TABS.map(({ value, label, icon: Icon }) => (
              <Tabs.Tab
                key={value}
                value={value}
                leftSection={<Icon size="1.25em" aria-hidden />}
                style={{ whiteSpace: 'nowrap' }}
              >
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </ScrollArea>

        {SETTINGS_TABS.map(({ value, icon: Icon, title, description }) => {
          const Panel = SETTINGS_PANELS[value];
          return (
            <Tabs.Panel key={value} value={value} pt="md">
              {Panel ? (
                <Panel />
              ) : (
                <EmptyState icon={Icon} title={title} description={description} />
              )}
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </Stack>
  );
}
