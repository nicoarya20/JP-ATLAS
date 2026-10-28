// Tasks ⑤ New task · Just write ✦ (prototype tasks.new.jsx TasksWrite), on POST /api/app/tasks/draft: the person
// picks a project from form-options, writes what needs doing, and Compose turns it into drafts to check, fix or drop
// before Save adds the kept ones. Speak is left out (gap: it needs a speech dependency). The state is use-just-write.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { SelectField } from '@/components/form/select-field';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { DRAFT_TEXT_MAX, draftsProblem } from '@/data/tasks.draft';
import type { FormProjectWire } from '@/data/tasks.form.api';

import { Labelled } from '../parts/labelled';
import { TaskPage } from '../parts/task-page';
import { Act, Foot, Soft } from '../parts/task-parts';
import { useTaskPeople } from '../parts/use-task-people';
import { F } from '../tasks.strings';
import { SPOKEN } from '../tasks.strings.added';
import { W } from '../tasks.strings.more';
import { FormProjectsGate } from './form.screen';
import { ModeSwitch } from './mode-switch';
import { useJustWrite } from './use-just-write';
import { AiHead, DraftCard, DraftQuestion } from './write-drafts';

/** Just write ✦ on the project in the route (`/tasks/new?project=<id>`) when the server offers it. */
export function TaskWriteScreen() {
  const { project } = useLocalSearchParams<{ project?: string }>();
  return (
    <FormProjectsGate mode={0} testID="screen-task-write">
      {(projects) => <JustWrite projects={projects} initialId={project} />}
    </FormProjectsGate>
  );
}

const SAVE_HINT = { none: W.pickOne, title: W.needTitle } as const;

function JustWrite({
  projects,
  initialId,
}: {
  projects: readonly FormProjectWire[];
  initialId?: string;
}) {
  const [projectId, setProjectId] = useState(
    () => (projects.find((p) => p.id === initialId) ?? projects[0]).id,
  );
  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const w = useJustWrite(project.id);
  const people = useTaskPeople(project.id);
  const rows = w.drafts?.rows ?? [];
  const kept = rows.filter((r) => r.keep).length;
  const problem = draftsProblem(rows);
  const blank = !w.text.trim();
  const pick = (id: string) => {
    if (id === project.id) return;
    setProjectId(id);
    w.reset();
  };
  const foot = (
    <Foot>
      <Act grow label={F.cancel} onPress={() => router.back()} />
      <Act
        wide
        kind="primary"
        label={W.save(kept)}
        disabled={!!problem || w.busy === 'compose'}
        hint={problem ? SAVE_HINT[problem] : undefined}
        loading={w.busy === 'save'}
        onPress={() => void w.save()}
        testID="write-save"
      />
    </Foot>
  );
  return (
    <TaskPage
      modal
      title={F.newTitle}
      foot={w.drafts ? foot : undefined}
      testID="screen-task-write"
    >
      <ModeSwitch value={0} project={project.id} />
      <Labelled required label={W.project}>
        <SelectField
          required
          label={W.project}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={project.id}
          onChange={pick}
          testID="write-project"
        />
      </Labelled>
      <Field
        multiline
        required
        label={W.textLabel}
        value={w.text}
        placeholder={W.textHint}
        hint={W.length(w.text.length, DRAFT_TEXT_MAX)}
        onChangeText={(t) => w.setText(t.slice(0, DRAFT_TEXT_MAX))}
        testID="write-text"
      />
      <HStack className="justify-end">
        <Act
          kind={w.drafts ? 'outline' : 'primary'}
          label={W.compose}
          name={SPOKEN.compose}
          disabled={blank || w.busy === 'save'}
          hint={blank ? W.composeHint : undefined}
          loading={w.busy === 'compose'}
          onPress={() => void w.compose()}
          testID="write-compose"
        />
      </HStack>
      {w.drafts && (
        <Soft>
          <HStack className="items-center justify-between gap-2">
            <AiHead>{W.draftNote}</AiHead>
            <Text className="text-footnote text-muted-foreground">{W.count(rows.length)}</Text>
          </HStack>
          {!rows.length && (
            <Text className="text-footnote text-muted-foreground">{W.noDrafts}</Text>
          )}
        </Soft>
      )}
      {rows.map((d, i) => (
        <DraftCard
          key={d.key}
          d={d}
          n={i + 1}
          people={people}
          kind={project.kinds.find((k) => k.id === d.kindId)?.name}
          onChange={(change) => w.edit(d.key, change)}
        />
      ))}
      {w.drafts?.question && (
        <DraftQuestion q={w.drafts.question} answer={w.drafts.answer} onAnswer={w.answer} />
      )}
      {w.error && <FormError testID="write-error">{w.error}</FormError>}
    </TaskPage>
  );
}
