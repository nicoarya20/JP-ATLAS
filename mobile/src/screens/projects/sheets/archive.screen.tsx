// Projects ⑭ Move to Archive (prototype projects.edit.jsx ProjectsArchive): names what goes along; the project and its
// tasks go to the Trash at once (`DELETE /api/app/projects/:id`) and the Projects list comes back with the snack
// "Project moved to Archive" and its Undo (T1).
//
// Undo is `POST /api/app/trash/project/:id/restore`. There is no local "held" copy to put back any more, and whether
// the project may come back is the server's to decide — it checks the retention window, which is why `restore` is
// deliberately not a `can{}` key. So a refused Undo shows the server's own sentence instead of this app's guess at
// why, and "deleted forever" is one such refusal rather than a case checked here first.
//
// The count in the sentence is `taskCounts.live` from the detail, which counts every task not already in the Trash,
// canceled ones too: what a delete actually takes along.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { showSnack } from '@/components/snack/use-snack';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  ensureProjectHeader,
  getProjectArchive,
  reloadProjectHeader,
  useProjectHeader,
} from '@/data/projects';
import { restoreProject, trashProject } from '@/data/projects.api.write';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Soft } from '../parts/display';
import { ARCHIVE } from '../projects.strings';

type Target = { id: string; name: string; tasks: string };

function ArchiveSheet({ p }: { p: Target }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const undo = async () => {
    try {
      await restoreProject(p.id);
      notice(ARCHIVE.restored);
    } catch (e) {
      // Past the retention window, or already deleted forever: the server's own sentence (K5).
      notice(e instanceof Error ? e.message : ARCHIVE.goneForever);
    }
  };
  const archive = async () => {
    setBusy(true);
    try {
      await trashProject(p.id);
      router.dismissTo('/projects');
      showSnack({
        message: ARCHIVE.moved,
        action: ARCHIVE.undo,
        onAction: () => void undo(),
      });
    } catch (e) {
      notice(e instanceof Error ? e.message : ARCHIVE.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <SheetFrame
      testID="project-archive"
      title={ARCHIVE.title}
      sub={p.name}
      actions={
        <>
          <Button
            variant="destructive"
            isDisabled={busy}
            accessibilityState={{ busy, disabled: busy }}
            onPress={() => void archive()}
          >
            {busy && <ButtonSpinner />}
            <ButtonText>{ARCHIVE.confirm}</ButtonText>
          </Button>
          <Button variant="outline" isDisabled={busy} onPress={() => router.back()}>
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

/** The archive sheet of the project in the route param `id`; a Member, or a project out of reach, goes home. */
export function ArchiveProjectScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { phase, error, notFound } = useProjectHeader(id);
  useEffect(() => {
    void ensureProjectHeader(id);
  }, [id]);
  // Read once the detail is there: archiving takes the project out of every list, and re-reading
  // then would leave the sheet with nothing to name while it closes.
  const [target, setTarget] = useState<Target | null>(null);
  const ready = getProjectArchive(id);
  useEffect(() => {
    if (ready && !target) setTarget(ready);
  }, [ready, target]);
  if (!allowedScreen('projects.archive', role)) return <Redirect href="/" />;
  if (notFound) return <Redirect href="/" />;
  if (!target) {
    return (
      <SheetFrame testID="project-archive-loading" title={ARCHIVE.title}>
        {phase === 'failed' ? (
          <FailedState
            testID="project-archive-failed"
            message={error?.message}
            onRetry={() => void reloadProjectHeader(id)}
          />
        ) : (
          <LoadingState testID="project-archive-spinner" />
        )}
      </SheetFrame>
    );
  }
  return <ArchiveSheet p={target} />;
}
