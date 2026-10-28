// The project detail's ⋯ menu and Extend deadline button, as the project's `can{}` allows: a capability that is
// `true` acts, one with a deny code stays in the menu and says why when picked (the menu has no disabled item), and
// a missing one is not offered. Move to Trash opens its confirmation sheet.
import { router } from 'expo-router';

import { ActionMenu, type MenuAction } from '@/components/menu/action-menu';
import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonText } from '@/components/ui/button';
import { capMessage } from '@/data/caps.messages';
import type { ProjectHead } from '@/data/projects.view';
import type { CapValueWire } from '@/data/projects.wire';

import { DETAIL } from '../projects.strings';

/** The ⋯ menu of project h; nothing when the viewer may neither edit nor trash it. */
export function ProjectMenu({ h }: { h: ProjectHead }) {
  const notice = useNotice();
  const item = (cap: CapValueWire | undefined, label: string, go: () => void): MenuAction[] =>
    cap === undefined
      ? []
      : [{ label, onPress: cap === true ? go : () => notice(capMessage(cap)) }];
  const items = [
    ...item(h.can.update, DETAIL.edit, () => router.push(`/projects/${h.id}/edit`)),
    ...item(h.can.trash, DETAIL.trash, () => router.push(`/projects/${h.id}/archive`)).map((m) => ({
      ...m,
      danger: true,
    })),
  ];
  if (!items.length) return null;
  return <ActionMenu items={items} label={DETAIL.actions} testID="project-actions" />;
}

/** Extend deadline, beside the extension pill; shown while `ProjectHead.canExtend`. */
export function ExtendButton({ id }: { id: string }) {
  return (
    <Button size="sm" variant="outline" onPress={() => router.push(`/projects/${id}/extend`)}>
      <ButtonText>{DETAIL.extend}</ButtonText>
    </Button>
  );
}
