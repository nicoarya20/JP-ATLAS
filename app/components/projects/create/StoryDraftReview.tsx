/**
 * Review screen of "Ceritakan proyeknya" (plan §4.8): the `ProjectForm` pre-filled from the draft,
 * the editable phase/task list, and "Simpan juga sebagai template" — independent of "Buat proyek".
 */
import { Alert, Button, Checkbox, Group, Stack } from '@mantine/core';
import type {
  ProjectDraft,
  ProjectDraftPhase,
  ProjectDraftTask,
} from '@server/ai/project-draft.types';
import type { IsoDate } from '@server/metrics/types';
import { useState } from 'react';
import { FiHelpCircle } from 'react-icons/fi';
import { type fieldErrors, ProjectForm } from '~/components/projects/ProjectForm';
import type { ProjectCreateInput } from '~/lib/projects-api';
import { DraftReviewList } from './DraftReviewList';
import {
  type EditableDraft,
  editableDraftOf,
  removePhase,
  removeTask,
  renamePhase,
  renameTask,
  toCreateProjectInput,
} from './project-draft.flow';
import { STORY_COPY as COPY } from './story-create.copy';
import { templateInputFromDraft } from './template-create.flow';
import { useProjectTemplates } from './useProjectTemplates';

type Person = { id: string; name: string };
type Props = {
  draft: ProjectDraft;
  today: IsoDate;
  creator: Person;
  creating: boolean;
  onCreate: (input: ProjectCreateInput) => Promise<ReturnType<typeof fieldErrors>>;
  onBack: () => void;
  cancelTo: string;
};

/** `edited` (local, with list keys) back to the plain `ProjectDraft` shape "Simpan sebagai template" converts from. */
function liveDraftOf(edited: EditableDraft): ProjectDraft {
  const task = (t: EditableDraft['looseTasks'][number]): ProjectDraftTask => ({
    title: t.title,
    description: t.description,
    priority: t.priority,
    kindName: t.kindName,
    dueDate: t.dueDate,
  });
  const phase = (p: EditableDraft['phases'][number]): ProjectDraftPhase => ({
    name: p.name,
    description: p.description,
    startDate: p.startDate,
    endDate: p.endDate,
    tasks: p.tasks.map(task),
  });
  return {
    name: edited.name,
    description: edited.description || null,
    startDate: edited.startDate,
    dueDate: edited.dueDate,
    priority: edited.priority,
    phases: edited.phases.map(phase),
    looseTasks: edited.looseTasks.map(task),
  };
}

export function StoryDraftReview({
  draft,
  today,
  creator,
  creating,
  onCreate,
  onBack,
  cancelTo,
}: Props) {
  const [edited, setEdited] = useState(() => editableDraftOf(draft));
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const templates = useProjectTemplates();

  const merge = (input: ProjectCreateInput): ProjectCreateInput => {
    const body = toCreateProjectInput(edited);
    return { ...input, phases: body.phases, looseTasks: body.looseTasks };
  };
  const saveTemplate = () =>
    void templates.create.run(templateInputFromDraft(liveDraftOf(edited), today));

  return (
    <Stack gap="lg">
      <Alert color="atlas" variant="light" icon={<FiHelpCircle size="1.25em" aria-hidden />}>
        {COPY.reviewDescription}
      </Alert>
      <DraftReviewList
        draft={edited}
        onRenamePhase={(key, name) => setEdited((d) => renamePhase(d, key, name))}
        onRenameTask={(key, title) => setEdited((d) => renameTask(d, key, title))}
        onRemovePhase={(key) => setEdited((d) => removePhase(d, key))}
        onRemoveTask={(key) => setEdited((d) => removeTask(d, key))}
      />
      <ProjectForm
        creator={creator}
        today={today}
        submitting={creating}
        cancelTo={cancelTo}
        initialValues={{
          name: edited.name,
          description: edited.description,
          startDate: edited.startDate,
          dueDate: edited.dueDate,
          priority: edited.priority ?? 'medium',
        }}
        onSubmit={async (input) => onCreate(merge(input))}
      />
      <Group justify="space-between" wrap="wrap" align="center">
        <Checkbox
          label={COPY.saveAsTemplate}
          checked={saveAsTemplate}
          onChange={(e) => setSaveAsTemplate(e.currentTarget.checked)}
        />
        <Button
          variant="default"
          loading={templates.create.loading}
          disabled={!saveAsTemplate}
          onClick={saveTemplate}
        >
          {COPY.saveAsTemplate}
        </Button>
      </Group>
      <Group justify="flex-start">
        <Button variant="subtle" onClick={onBack} disabled={creating}>
          {COPY.back}
        </Button>
      </Group>
    </Stack>
  );
}
