// Project detail header (prototype projects.detail.jsx DetailScreen) from the server: status and condition, the
// server's reason as it came (K5), who set a manual condition, Lead and deadline, the extension pill, then the tabs.
import { router } from 'expo-router';

import { Seg } from '@/components/form/seg';
import { StatusPill } from '@/components/status/status-pill';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProjectHead } from '@/data/projects.view';
import { ConditionPill } from '@/screens/home/parts/condition-pill';

import { Note } from '../parts/display';
import { DETAIL } from '../projects.strings';

export const TABS = ['overview', 'tasks', 'phases', 'members'] as const;
export type DetailTab = (typeof TABS)[number];

/** Status block of the header; `extra` sits beside the extension pill (Extend deadline). */
export function DetailHead({ h, extra }: { h: ProjectHead; extra?: React.ReactNode }) {
  return (
    <VStack className="gap-2">
      <HStack className="flex-wrap gap-2">
        <StatusPill status={h.status} />
        <ConditionPill condition={h.condition} />
      </HStack>
      {!!h.reason && <Text className="text-subhead">{h.reason}</Text>}
      {h.manual && <Note>{h.manual}</Note>}
      <Text className="text-subhead font-semibold">{DETAIL.leadDue(h.lead, h.due)}</Text>
      {(h.extended || extra) && (
        <HStack className="items-center justify-between gap-2">
          {h.extended ? <StatusPill status={h.extended} /> : <VStack />}
          {extra}
        </HStack>
      )}
    </VStack>
  );
}

/** Overview / Phases / Members; switching swaps the route param `tab` in place. */
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
