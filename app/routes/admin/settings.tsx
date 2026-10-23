import { Group, ScrollArea, Stack, Tabs, Text, Title } from '@mantine/core';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { brandingForEditor } from '@server/settings-branding';
import { useSearchParams } from 'react-router';
import type { IdentitasData } from '~/components/admin/settings/identitas.panel';
import { SETTINGS_PANELS } from '~/components/admin/settings/panels';
import { SETTINGS_PREVIEWS } from '~/components/admin/settings/settings.previews';
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
 * its registered panel (`panels.tsx`), else the preview that shows the tab's shape with sample
 * content (`settings.previews.tsx`), else the placeholder from `settings.tabs.ts`. The guard is
 * repeated here on purpose — React Router runs the layout and page loaders in parallel, so the
 * layout guard does not cover this page's data.
 *
 * The loader carries what the filled tabs need. Identitas (RD-03) is read here rather than from
 * the API because `GET /api/settings/all` stays super-admin: an Admin writes branding but may not
 * read the whole overview.
 */
export async function loader({ request }: Route.LoaderArgs) {
  await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  const branding: IdentitasData = await brandingForEditor();
  return { branding };
}

/**
 * Switching tab only changes `?tab=`, so skip that reload. An explicit revalidate (a panel just
 * saved) leaves the URL untouched and must still go through, or the form would keep showing the
 * values from before the save.
 */
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (currentUrl.pathname !== nextUrl.pathname) return true;
  return currentUrl.search === nextUrl.search && defaultShouldRevalidate;
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
          // Real panel first; while none is registered, the preview stands in for it, and the
          // EmptyState is the last resort for a tab that has neither.
          const Panel = SETTINGS_PANELS[value] ?? SETTINGS_PREVIEWS[value];
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
