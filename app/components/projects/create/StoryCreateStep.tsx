/**
 * "Ceritakan proyeknya" end to end (plan §4): the story form, then the draft review, with every AI
 * fallback (disabled, down, rate limited, ambiguous) still ending in a usable plain form.
 */
import { Alert, Button, Stack } from '@mantine/core';
import type { ProjectDraft } from '@server/ai/project-draft.types';
import type { IsoDate } from '@server/metrics/types';
import { useEffect, useState } from 'react';
import { FiHelpCircle } from 'react-icons/fi';
import { fieldErrors, ProjectForm } from '~/components/projects/ProjectForm';
import { useProjectActions } from '~/components/projects/useProjectActions';
import { notify } from '~/components/ui/notify';
import type { ProjectCreateInput } from '~/lib/projects-api';
import { StoryDraftReview } from './StoryDraftReview';
import { StoryForm } from './StoryForm';
import { STORY_COPY as COPY } from './story-create.copy';
import { useProjectDraft } from './useProjectDraft';

const TICK_MS = 1000;

type Person = { id: string; name: string };
type Props = {
  creator: Person;
  today: IsoDate;
  cancelTo: string;
  onSaved: (projectId: string) => void;
  onBack: () => void;
};

export function StoryCreateStep({ creator, today, cancelTo, onSaved, onBack }: Props) {
  const draftHook = useProjectDraft();
  const { create } = useProjectActions();
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [rateLimitedFor, setRateLimitedFor] = useState(0);

  useEffect(() => {
    if (rateLimitedFor <= 0) return;
    const id = setInterval(() => setRateLimitedFor((s) => Math.max(0, s - 1)), TICK_MS);
    return () => clearInterval(id);
  }, [rateLimitedFor]);

  const create_ = async (input: ProjectCreateInput) => {
    const res = await create.run(input);
    if (res.ok) {
      onSaved(res.data.id);
      return null;
    }
    return fieldErrors(res.error) ?? {};
  };

  const compose = async (text: string) => {
    const outcome = await draftHook.compose(text);
    if (outcome.kind === 'ok') {
      setDraft(outcome.body.draft);
      setQuestion(outcome.body.question);
      return;
    }
    if (outcome.kind === 'fallback') {
      setFallbackText(text);
      notify.error(COPY.genericError, COPY.fallbackNotice);
      return;
    }
    if (outcome.kind === 'rate') {
      setRateLimitedFor(outcome.seconds);
      notify.error(COPY.genericError, COPY.rateLimited(outcome.seconds));
      return;
    }
    notify.error(COPY.genericError, outcome.message);
  };

  if (draft) {
    return (
      <StoryDraftReview
        draft={draft}
        today={today}
        creator={creator}
        creating={create.loading}
        onCreate={create_}
        onBack={() => {
          setDraft(null);
          setQuestion(null);
        }}
        cancelTo={cancelTo}
      />
    );
  }

  // Fallback (AI down) or an open question (story too unclear): a plain form, never a dead end.
  if (fallbackText !== null || question !== null) {
    return (
      <Stack gap="md">
        {question !== null && (
          <Alert color="atlas" variant="light" icon={<FiHelpCircle size="1.25em" aria-hidden />}>
            {question}
          </Alert>
        )}
        <ProjectForm
          creator={creator}
          today={today}
          submitting={create.loading}
          cancelTo={cancelTo}
          initialValues={{ description: fallbackText ?? '' }}
          onSubmit={create_}
        />
        <Button variant="subtle" onClick={onBack}>
          {COPY.back}
        </Button>
      </Stack>
    );
  }

  return (
    <StoryForm
      loading={draftHook.loading}
      rateLimitedFor={rateLimitedFor}
      onSubmit={compose}
      onBack={onBack}
    />
  );
}
