// Tasks ⑥ New task · Fill form (prototype tasks.form.jsx): every field is live and Save adds a To do task, then opens
// its detail. Values start from the first AI draft of Just write; Show more starts open, as in the prototype.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/form/field';
import { Seg } from '@/components/form/seg';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getTaskForm } from '@/data/tasks';
import {
  canSave,
  phasesOf,
  pickProject,
  reviewersOf,
  saveNewTask,
  shownReviewer,
} from '@/data/tasks.form';
import { fullName } from '@/data/tasks.shared';
import { TaskPage } from '../parts/task-page';
import { Act, Foot } from '../parts/task-parts';
import { F } from '../tasks.strings';
import { DateEdit, MoreToggle, PriorityEdit, TypePhaseEdit, useTaskForm } from './form-choices';
import { AssigneeEdit, Labelled, ReviewEdit, TagsEdit } from './form-fields';

/** New task · Fill form for `role`, on the project in the route (`/tasks/new/form?project=<id>`) when allowed. */
export function TaskFormScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { project: projectId } = useLocalSearchParams<{ project?: string }>();
  const notice = useNotice();
  const [start] = useState(() => getTaskForm(role, projectId));
  const [projectIdNow, setProjectId] = useState(start.project.id);
  const { f, setF, set } = useTaskForm(() => start.initial);
  const [more, setMore] = useState(true);
  const project = start.projects.find((p) => p.id === projectIdNow) ?? start.project;
  const reviewers = reviewersOf(project, f.who);
  const pick = (id: string) => {
    const next = start.projects.find((p) => p.id === id);
    if (!next) throw new Error(`Cannot pick project "${id}" in New task: not offered to ${role}`);
    setProjectId(id);
    setF((s) => pickProject(s, next));
  };
  const save = () => {
    const no = saveNewTask(role, project, f);
    notice(F.created);
    router.dismiss();
    router.push(`/tasks/${no}`);
  };
  const foot = (
    <Foot>
      <Act grow label={F.cancel} onPress={() => router.back()} />
      <Act
        wide
        kind="primary"
        label={F.save}
        disabled={!canSave(f)}
        onPress={save}
        testID="form-save"
      />
    </Foot>
  );
  return (
    <TaskPage modal title={F.newTitle} foot={foot} testID="screen-task-form">
      <Seg
        items={F.modes}
        value={1}
        onChange={(i) => i === 0 && router.replace('/tasks/new')}
        testID="new-mode"
      />
      <Labelled label={F.projectRequired}>
        <SelectField
          label={F.project}
          options={start.projects.map((p) => ({ value: p.id, label: p.name }))}
          value={project.id}
          onChange={pick}
          testID="form-project"
        />
      </Labelled>
      <Field
        required
        label={F.title}
        value={f.title}
        onChangeText={set('title')}
        testID="field-title"
      />
      <AssigneeEdit
        people={project.members.map((n) => ({ value: n, label: fullName(n) }))}
        who={f.who}
        onChange={set('who')}
      />
      <PriorityEdit value={f.priority} onChange={set('priority')} />
      <DateEdit label={F.due} value={f.due} onChange={set('due')} />
      <MoreToggle more={more} onToggle={() => setMore((m) => !m)} />
      {more && (
        <>
          <View className="h-px bg-border" />
          <Field
            multiline
            label={F.description}
            value={f.desc}
            placeholder={F.descHint}
            onChangeText={set('desc')}
          />
          <TypePhaseEdit
            type={f.type}
            phase={f.phase}
            phases={phasesOf(project.id)}
            onType={set('type')}
            onPhase={set('phase')}
          />
          <HStack className="gap-3">
            <DateEdit label={F.start} value={f.start ?? ''} onChange={set('start')} />
            <View className="min-w-0 flex-1">
              <Field
                label={F.hours}
                value={f.hours ?? ''}
                onChangeText={set('hours')}
                keyboardType="numeric"
              />
            </View>
          </HStack>
          <TagsEdit tags={f.tags} onChange={set('tags')} />
          <ReviewEdit
            f={f}
            reviewer={shownReviewer(reviewers, f.reviewer)}
            options={reviewers}
            member={start.member}
            onReview={set('review')}
            onReviewer={set('reviewer')}
          />
          <Text className="text-footnote text-muted-foreground">
            {F.review.projectNote(project.name)}
          </Text>
        </>
      )}
    </TaskPage>
  );
}
