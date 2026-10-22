/**
 * The two ways to make a task on Tugas baru (Tugas ⑤ / ⑥, keputusan #11): "Tulis saja ✦" (AI drafts)
 * and "Isi form". Only the open way is mounted, because the router allows one unsaved-changes guard
 * at a time and each way brings its own. The story and drafts live here, so switching keeps them.
 */
import { SegmentedControl, Stack, Text } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { TaskFormProject } from '@server/task/task-form.query';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchProjectMembers, type ProjectMemberItem, projectKeys } from '~/lib/projects-api';
import { openDiscardConfirm, useUnsavedGuard } from '~/lib/use-unsaved-guard';
import { type SavedTask, TaskCreateForm } from './TaskCreateForm';
import { TaskDraftEditModal } from './TaskDraftEditModal';
import { defaultKindId, workersOf } from './TaskForm';
import { TaskWriteSection } from './TaskWriteSection';
import { storyToValues } from './task-draft';
import { WRITE_COPY as COPY } from './task-draft.copy';
import { hasUnsavedWork } from './task-draft.state';
import { newTaskValues, type TaskFormValues } from './task-form';
import { TASK_FORM_COPY } from './task-form.copy';
import { useTaskWrite } from './useTaskWrite';

type Mode = 'write' | 'form';
type Seed = { key: number; values: TaskFormValues };

export type TaskCreateModesProps = {
  projects: TaskFormProject[];
  /** What the plain form opens with (project preset, the viewer as assignee when they work there). */
  initialValues: TaskFormValues;
  initialMembers?: ProjectMemberItem[];
  viewer: { id: string; name: string };
  today: IsoDate;
  cancelTo: string;
  /** Whether the server has an AI provider; without one "Tulis saja" stays off and the form opens. */
  aiEnabled: boolean;
  /** A task made in the form was saved. */
  onSubmitted: (task: SavedTask) => void;
};

/** Registers the unsaved-changes guard while it is mounted, so the way that owns the work owns the guard. */
function WriteGuard({ dirty }: { dirty: boolean }) {
  useUnsavedGuard(dirty);
  return null;
}

export function TaskCreateModes(props: TaskCreateModesProps) {
  const { projects, initialValues, viewer, today, cancelTo, aiEnabled } = props;
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(aiEnabled ? 'write' : 'form');
  const [projectId, setProjectId] = useState<string | null>(initialValues.projectId);
  const [seed, setSeed] = useState<Seed>({ key: 0, values: initialValues });
  const [editing, setEditing] = useState<string | null>(null);
  // Typing in the form counts as work to protect when the user switches away from it.
  const formTouched = useRef(false);

  const kindOf = useCallback(
    (id: string | null) => projects.find((p) => p.id === id)?.kinds ?? [],
    [projects],
  );
  const members = useQuery({
    queryKey: projectKeys.members(projectId ?? ''),
    queryFn: () => fetchProjectMembers(projectId ?? ''),
    enabled: Boolean(projectId),
    initialData: projectId === initialValues.projectId ? props.initialMembers : undefined,
  });
  const workers = workersOf(members.data ?? []);
  const assigneeName = (id: string | null) => {
    const found = workers.find((m) => m.userId === id);
    if (!found) return null;
    return found.userId === viewer.id ? TASK_FORM_COPY.me(found.name) : found.name;
  };
  const kindName = (id: string | null) => kindOf(projectId).find((k) => k.id === id)?.name ?? null;

  /** The form's starting values for a project: the loader's own when it is the same one. */
  const seedFor = useCallback(
    (id: string | null): TaskFormValues =>
      id === initialValues.projectId
        ? initialValues
        : { ...newTaskValues(id, null), kindId: defaultKindId(kindOf(id)) },
    [initialValues, kindOf],
  );

  const openForm = useCallback((values: TaskFormValues) => {
    formTouched.current = false;
    setSeed((s) => ({ key: s.key + 1, values }));
    setMode('form');
  }, []);

  const write = useTaskWrite({
    projectId,
    defaultKindId: (id) => defaultKindId(kindOf(id)),
    // The user's text goes to Judul; nothing they wrote is lost when the AI cannot answer.
    onFallback: (text) => openForm(storyToValues(text, projectId, seedFor(projectId))),
    onFinished: (saved) =>
      navigate(saved.length === 1 && saved[0] ? `/app/tasks/${saved[0].number}` : cancelTo),
  });

  const switchMode = (next: string) => {
    if (next === mode) return;
    if (next === 'form') return openForm(seedFor(projectId));
    if (!formTouched.current) return setMode('write');
    openDiscardConfirm({ onDiscard: () => setMode('write'), onStay: () => undefined });
  };

  const editItem = write.state.items.find((i) => i.id === editing) ?? null;
  const closeEdit = useCallback(() => setEditing(null), []);
  const onEdited = useCallback(
    (id: string, task: SavedTask) => {
      setEditing(null);
      write.markSaved(id, task);
    },
    [write.markSaved],
  );

  return (
    <Stack gap="md">
      <Stack gap={6}>
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={switchMode}
          aria-label={COPY.modeLabel}
          data={[
            { value: 'write', label: COPY.modeWrite, disabled: !aiEnabled },
            { value: 'form', label: COPY.modeForm },
          ]}
        />
        {!aiEnabled && (
          <Text size="sm" c="dimmed">
            {COPY.disabledReason}
          </Text>
        )}
      </Stack>
      {mode === 'write' ? (
        <>
          {/* One guard at a time: the Ubah dialog's own form brings its own while it is open. */}
          {editing === null && <WriteGuard dirty={hasUnsavedWork(write.state)} />}
          <TaskWriteSection
            write={write}
            projects={projects}
            projectId={projectId}
            onProject={setProjectId}
            assigneeName={assigneeName}
            kindName={kindName}
            onEdit={setEditing}
          />
          <TaskDraftEditModal
            item={editItem}
            projects={projects}
            members={members.data}
            viewer={viewer}
            today={today}
            cancelTo={cancelTo}
            onClose={closeEdit}
            onSaved={onEdited}
          />
        </>
      ) : (
        <div onInput={() => (formTouched.current = true)}>
          <TaskCreateForm
            key={seed.key}
            projects={projects}
            initialValues={seed.values}
            initialMembers={
              seed.values.projectId === initialValues.projectId ? props.initialMembers : undefined
            }
            viewer={viewer}
            today={today}
            cancelTo={cancelTo}
            onSubmitted={props.onSubmitted}
          />
        </div>
      )}
    </Stack>
  );
}
