// Project detail header (prototype projects.detail.jsx DetailScreen): the Trash note, status and health, why, Lead
// and deadline, the extension pill and Extend deadline, then the four tabs.
//
// Which of these are offered is the server's answer, not a role test of this app's own: `can.update` carries Edit and
// Extend deadline, `can.trash` carries Move to Archive. A key the server left out means the control is not drawn at
// all; a key that came back as a deny code means it is drawn and refuses with one honest line, because `can{}` sends
// the code and not the sentence (see CAP_DISABLED_REASON).
//
// Project settings is gone from the menu: `can.manageKinds` exists but there is no `/api/app` route for task kinds at
// all (GAP A-12), so the screen behind it could only ever show sample data. Listed in
// docs/phase2-gap-disembunyikan.md.
import { router } from 'expo-router';

import { Seg } from '@/components/form/seg';
import type { MenuAction } from '@/components/menu/action-menu';
import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { ProjectHeader } from '@/data/projects';
import { CAP_DISABLED_REASON, capState } from '@/data/projects.api.map';

import { Note } from '../parts/display';
import { DETAIL } from '../projects.strings';

export const TABS = ['overview', 'tasks', 'phases', 'members'] as const;
export type DetailTab = (typeof TABS)[number];

/**
 * The ⋯ items the server allows.
 *
 * An item whose capability came back as a deny code is kept and says the one line this app has for
 * all of them; the shared ⋯ menu draws no disabled item, so "shown but refusing" is as close as it
 * gets without changing a component three modules share. An item whose key is absent is left out,
 * which is exactly what the server asked for.
 */
export function projectMenu(h: ProjectHeader, say: (message: string) => void): MenuAction[] {
  const items: MenuAction[] = [];
  const edit = capState(h.can, 'update');
  const trash = capState(h.can, 'trash');
  if (edit !== 'hidden') {
    items.push({
      label: DETAIL.edit,
      onPress:
        edit === 'on'
          ? () => router.push(`/projects/${h.id}/edit`)
          : () => say(CAP_DISABLED_REASON),
    });
  }
  if (trash !== 'hidden') {
    items.push({
      label: DETAIL.archive,
      danger: true,
      onPress:
        trash === 'on'
          ? () => router.push(`/projects/${h.id}/archive`)
          : () => say(CAP_DISABLED_REASON),
    });
  }
  return items;
}

/** Status block of the header. */
export function DetailHead({ h }: { h: ProjectHeader }) {
  // A18: the server has no key for extending a deadline and guards the route with the same rule as
  // `update` (`canManageProject`), so `update` is the right proxy today — and the only honest one,
  // since a rule of this app's own is exactly what §3 of the data map forbids.
  const extend = capState(h.can, 'update');
  return (
    <VStack className="gap-2">
      {h.archived && <Note>{DETAIL.inArchive}</Note>}
      <HStack className="flex-wrap gap-2">
        <StatusPill status={h.status} />
        <StatusPill status={h.health} />
      </HStack>
      {/* The server's own Indonesian sentence, shown as it came (K5). */}
      {!!h.why && <Text className="text-subhead">{DETAIL.why(h.why)}</Text>}
      <Text className="text-subhead font-semibold">{DETAIL.leadDue(h.lead, h.dueLong)}</Text>
      {(!!h.extended || extend !== 'hidden') && (
        <HStack className="items-center justify-between gap-2">
          {h.extended ? <StatusPill status={h.extended} /> : <VStack />}
          {extend !== 'hidden' && (
            <Button
              size="sm"
              variant="outline"
              isDisabled={extend === 'off'}
              accessibilityHint={extend === 'off' ? CAP_DISABLED_REASON : undefined}
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
