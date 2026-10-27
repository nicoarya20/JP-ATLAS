// Projects ⑭ Move to Archive (prototype projects.edit.jsx ProjectsArchive): names what goes along; the project and its
// tasks move to Archive at once and the Projects list comes back with the snack "Project moved to Archive" and its Undo
// (T1, phase1-screens.md K5), unless Archive deleted it forever in the meantime.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { showSnack } from '@/components/snack/use-snack';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { me } from '@/data/people';
import { getProjectArchive } from '@/data/projects';
import { archiveProject, canRestoreProject, restoreProject } from '@/data/projects.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Soft } from '../parts/display';
import { ARCHIVE } from '../projects.strings';

/** The archive sheet of the project in the route param `id`; a Member, or a project not listed, goes home. */
export function ArchiveProjectScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useNotice();
  // Read once: archiving takes the project out of the list, which must not redirect the sheet while it closes.
  const [p] = useState(() => getProjectArchive(id));
  if (!p || !allowedScreen('projects.archive', role)) return <Redirect href="/" />;
  const archive = () => {
    const key = archiveProject(p.id, me(role).name);
    router.dismissTo('/projects');
    showSnack({
      message: ARCHIVE.moved,
      action: ARCHIVE.undo,
      // The snack is already closed here. Deleted forever in Archive within the Undo window → say so, restore nothing.
      onAction: () => {
        if (!canRestoreProject(p.id, key)) {
          notice(ARCHIVE.goneForever);
          return;
        }
        restoreProject(p.id, key);
        notice(ARCHIVE.restored);
      },
    });
  };
  return (
    <SheetFrame
      testID="project-archive"
      title={ARCHIVE.title}
      sub={p.name}
      actions={
        <>
          <Button variant="destructive" onPress={archive}>
            <ButtonText>{ARCHIVE.confirm}</ButtonText>
          </Button>
          <Button variant="outline" onPress={() => router.back()}>
            <ButtonText>{ARCHIVE.cancel}</ButtonText>
          </Button>
        </>
      }
    >
      <Text className="text-subhead">{ARCHIVE.lead(p.name, p.tasks)}</Text>
      <Soft>{ARCHIVE.box}</Soft>
    </SheetFrame>
  );
}
