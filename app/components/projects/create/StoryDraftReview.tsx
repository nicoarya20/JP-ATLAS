/**
 * Review screen of "Ceritakan proyeknya" (plan §4.8): the `ProjectForm` pre-filled from the draft
 * and the editable phase/task list. Templates are saved from a created project, not from this draft.
 */
import { Alert, Button, Group, Stack } from '@mantine/core';
import type { ProjectDraft } from '@server/ai/project-draft.types';
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

  const merge = (input: ProjectCreateInput): ProjectCreateInput => {
    const body = toCreateProjectInput(edited);
    return { ...input, phases: body.phases, looseTasks: body.looseTasks };
  };

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
      <Group justify="flex-start">
        {/* Back to the story form with the text kept; the chooser link is the page header's. */}
        <Button variant="subtle" onClick={onBack} disabled={creating}>
          {COPY.editStory}
        </Button>
      </Group>
    </Stack>
  );
}
