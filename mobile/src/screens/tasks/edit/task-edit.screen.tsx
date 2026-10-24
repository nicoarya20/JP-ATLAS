// Tasks ⑧b Edit task (detail ⋯ › Edit task, prototype tasks.edit.jsx): every field the detail shows, saved through the
// task store. Status moves through the detail actions or the board, and Created by is a record, so neither is edited.
import { router, useLocalSearchParams } from 'expo-router';
import { ListX, Lock } from 'lucide-react-native';

import { Field } from '@/components/form/field';
import { useNotice } from '@/components/notice/use-notice';
import { EmptyState } from '@/components/state/empty-state';
import { Text } from '@/components/ui/text';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getTaskEdit } from '@/data/tasks';
import {
  canSave,
  reviewersOf,
  saveTaskEdit,
  shownReviewer,
  type TaskEditView,
} from '@/data/tasks.form';

import { DateEdit, PriorityEdit, TypePhaseEdit, useTaskForm } from '../new/form-choices';
import { AssigneeEdit, ReviewEdit } from '../new/form-fields';
import { TagsEdit } from '../new/tags-edit';
import { saveHint, TitleField } from '../new/title-field';
import { TaskPage } from '../parts/task-page';
import { Act, Foot } from '../parts/task-parts';
import { F, S } from '../tasks.strings';
import { EvidenceEdit, StepsEdit } from './edit-lists';

type EditView = Extract<TaskEditView, { allowed: true }>;

const BackFoot = () => (
  <Foot>
    <Act grow label={F.back} onPress={() => router.back()} />
  </Foot>
);

/** Edit task for the task in the route (`/tasks/<no>/edit`); someone who may not change it gets the reason. */
export function TaskEditScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const no = Number(id);
  const view = getTaskEdit(role, no);
  if (!view?.allowed) {
    return (
      <TaskPage title={F.editTitle} foot={<BackFoot />} testID="task-edit-denied">
        {view ? (
          <EmptyState icon={Lock} title={view.title} text={view.text} />
        ) : (
          <EmptyState icon={ListX} title={S.detail.missing} text={S.detail.missingText} />
        )}
      </TaskPage>
    );
  }
  return <EditForm role={role} no={no} view={view} />;
}

function EditForm({ role, no, view }: { role: Role; no: number; view: EditView }) {
  const notice = useNotice();
  const { f, set } = useTaskForm(() => view.initial);
  const reviewers = reviewersOf({ members: view.members }, f.who);
  const reviewer = shownReviewer(reviewers, f.reviewer);
  const save = () => {
    notice(saveTaskEdit(role, no, f));
    router.back();
  };
  const foot = (
    <Foot>
      <Act grow label={F.cancel} onPress={() => router.back()} />
      <Act
        wide
        kind="primary"
        label={F.save}
        disabled={!canSave(f)}
        hint={saveHint(f)}
        onPress={save}
        testID="edit-save"
      />
    </Foot>
  );
  return (
    <TaskPage title={F.editTitle} foot={foot} testID="screen-task-edit">
      <Text className="text-footnote text-muted-foreground">{view.meta}</Text>
      <TitleField value={f.title} onChange={set('title')} />
      <AssigneeEdit people={view.people} who={f.who} onChange={set('who')} />
      <DateEdit label={F.due} value={f.due} onChange={set('due')} />
      <PriorityEdit value={f.priority} onChange={set('priority')} />
      <TypePhaseEdit
        type={f.type}
        phase={f.phase}
        phases={view.phases}
        onType={set('type')}
        onPhase={set('phase')}
      />
      <ReviewEdit
        f={f}
        reviewer={reviewer}
        options={reviewers}
        locked={view.reviewLocked}
        member={view.member}
        onReview={set('review')}
        onReviewer={set('reviewer')}
      />
      <TagsEdit tags={f.tags} onChange={set('tags')} />
      <Field
        multiline
        label={F.description}
        value={f.desc}
        placeholder={F.descHint}
        onChangeText={set('desc')}
      />
      <StepsEdit steps={f.steps} onChange={set('steps')} />
      <EvidenceEdit proof={f.proof} onChange={set('proof')} />
      <Text className="text-footnote text-muted-foreground">{F.statusNote}</Text>
    </TaskPage>
  );
}
