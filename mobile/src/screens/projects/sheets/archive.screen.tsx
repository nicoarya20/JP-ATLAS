// Projects ⑭ Move to Trash (T2, prototype projects.edit.jsx ProjectsArchive), from the detail ⋯ for whoever the
// server lets trash the project (`can.trash`): it names the tasks that go along (`taskCounts.live`). Once the server
// moved them, the Projects list comes back with "Project moved to Trash" and its Undo, which restores the project
// with its tasks; a refusal stays on the sheet. The route keeps its old name, `archive`.
import { router, useLocalSearchParams } from 'expo-router';

import { isApiError } from '@/api/errors';
import { useConfirmAction } from '@/components/confirm/use-confirm-action';
import { FormError } from '@/components/form/form-error';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { showSnack } from '@/components/snack/use-snack';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { ProjectDetailWire } from '@/data/projects.wire';
import { restoreProject, trashProject } from '@/data/projects.write';

import { Soft } from '../parts/display';
import { ProjectGate } from '../parts/project-gate';
import { writeError } from '../parts/write-run';
import { TRASH } from '../projects.strings';

function Trash({ p }: { p: ProjectDetailWire }) {
  const notice = useNotice();
  // The snack is already closed here, and so is this sheet: the outcome goes to a notice.
  const undo = async () => {
    try {
      await restoreProject(p.id);
      notice(TRASH.restored);
    } catch (e) {
      notice(writeError(e));
      if (!isApiError(e)) throw e;
    }
  };
  const trash = async () => {
    await trashProject(p.id);
    router.dismissTo('/projects');
    showSnack({ message: TRASH.moved, action: TRASH.undo, onAction: () => void undo() });
  };
  const { busy, error, run } = useConfirmAction(trash, () => undefined, writeError);
  return (
    <SheetFrame
      testID="project-trash"
      title={TRASH.title}
      sub={p.name}
      actions={
        <>
          <Button variant="destructive" isDisabled={busy} onPress={() => void run()}>
            {busy && <ButtonSpinner />}
            <ButtonText>{TRASH.confirm}</ButtonText>
          </Button>
          <Button variant="outline" isDisabled={busy} onPress={() => router.back()}>
            <ButtonText>{TRASH.cancel}</ButtonText>
          </Button>
        </>
      }
    >
      <Text className="text-subhead">{TRASH.lead(p.name, p.taskCounts.live)}</Text>
      <Soft>{TRASH.box}</Soft>
      {error && <FormError testID="trash-error">{error}</FormError>}
    </SheetFrame>
  );
}

/** The Move to Trash sheet of the project in the route param `id`; anyone it is not offered to goes back to it. */
export function ArchiveProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ProjectGate id={id} allowed={(p) => p.can.trash === true}>
      {(p) => <Trash p={p} />}
    </ProjectGate>
  );
}
