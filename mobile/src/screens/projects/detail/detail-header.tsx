// Project detail header (prototype projects.detail.jsx DetailScreen): the Archive note, status and health, why, Lead
// and deadline, the extension pill and Extend deadline (Manager / Admin), then the four tabs.
import { router } from 'expo-router';

import { Seg } from '@/components/form/seg';
import type { MenuAction } from '@/components/menu/action-menu';
import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProjectHeader } from '@/data/projects';

import { Note } from '../parts/project-parts';
import { DETAIL } from '../projects.strings';

export const TABS = ['overview', 'tasks', 'phases', 'members'] as const;
export type DetailTab = (typeof TABS)[number];

/** The ⋯ items of a project a Manager or Admin can change. */
export const projectMenu = (id: string): MenuAction[] => [
  { label: DETAIL.edit, onPress: () => router.push(`/projects/${id}/edit`) },
  { label: DETAIL.settings, onPress: () => router.push(`/projects/${id}/settings`) },
  { label: DETAIL.archive, danger: true, onPress: () => router.push(`/projects/${id}/archive`) },
];

/** Status block of the header. */
export function DetailHead({ h }: { h: ProjectHeader }) {
  return (
    <VStack className="gap-2">
      {h.archived && <Note>{DETAIL.inArchive}</Note>}
      <HStack className="flex-wrap gap-2">
        <StatusPill status={h.status} />
        <StatusPill status={h.health} />
      </HStack>
      {!!h.why && <Text className="text-subhead">{DETAIL.why(h.why)}</Text>}
      <Text className="text-subhead font-semibold">{DETAIL.leadDue(h.lead, h.dueLong)}</Text>
      {(h.extended || h.canEdit) && (
        <HStack className="items-center justify-between gap-2">
          {h.extended ? <StatusPill status={h.extended} /> : <VStack />}
          {h.canEdit && (
            <Button
              size="sm"
              variant="outline"
              onPress={() => router.push(`/projects/${h.id}/extend`)}
            >
              <ButtonText>{DETAIL.extend}</ButtonText>
            </Button>
          )}
        </HStack>
      )}
    </VStack>
  );
}

/** Overview / Tasks / Phases / Members; switching swaps the route param `tab` in place. */
export function DetailTabs({ tab }: { tab: DetailTab }) {
  return (
    <Seg
      testID="project-tabs"
      items={DETAIL.tabs}
      value={TABS.indexOf(tab)}
      onChange={(i) => router.setParams({ tab: TABS[i] ?? TABS[0] })}
    />
  );
}
