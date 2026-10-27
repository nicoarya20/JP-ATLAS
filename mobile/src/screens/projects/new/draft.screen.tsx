// Projects ⑥ Review draft (prototype projects.draft.jsx ProjectsDraft): the AI banner, Project info (Edit opens the
// form), then each phase with its milestone and initial tasks; unchecking drops a phase or task, a task's type can be
// changed. Rebuild returns to the story; Create project saves nothing in Phase 1, like the prototype.
import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getProjectCreate } from '@/data/projects.sample-form';
import { rangeLabel } from '@/data/projects.dates';
import type { Role } from '@/data/sample';
import type { DraftType, StoryPhase } from '@/data/sample/projects.extra';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Ai, Info, Note, Sec, Soft } from '../parts/display';
import { CheckRow, Foot } from '../parts/form-bits';
import { CREATE, DRAFT } from '../projects.strings';
import { createProject } from './create-done';

const TYPE_OPTIONS = DRAFT.types.map((t) => ({ value: t, label: t }));

type PhaseEdit = { on: boolean; tasks: { on: boolean; type: DraftType }[] };

function PhaseCard({
  n,
  ph,
  e,
  set,
}: {
  n: number;
  ph: StoryPhase;
  e: PhaseEdit;
  set: (e: PhaseEdit) => void;
}) {
  const task = (i: number, t: Partial<PhaseEdit['tasks'][number]>) =>
    set({ ...e, tasks: e.tasks.map((x, j) => (j === i ? { ...x, ...t } : x)) });
  return (
    <Sec testID={`draft-phase-${n}`}>
      <CheckRow label={DRAFT.phase(n, ph.name)} value={e.on} onChange={(on) => set({ ...e, on })} />
      <Note>{rangeLabel(ph.start, ph.end)}</Note>
      <Text className="text-subhead text-foreground">{DRAFT.milestone(ph.milestone)}</Text>
      {e.on &&
        ph.tasks.map((t, i) => (
          <HStack key={t.title} className="items-center gap-2">
            <CheckRow
              label={t.title}
              value={e.tasks[i]?.on ?? false}
              onChange={(on) => task(i, { on })}
            />
            <VStack className="w-28">
              <SelectField
                label={DRAFT.type(t.title)}
                options={TYPE_OPTIONS}
                value={e.tasks[i]?.type ?? t.type}
                disabled={!e.tasks[i]?.on}
                onChange={(type) => task(i, { type })}
              />
            </VStack>
          </HStack>
        ))}
    </Sec>
  );
}

/** The AI draft of the story, for a Manager or Admin; a Member goes home. */
export function ProjectDraftScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const notice = useNotice();
  const [{ draft }] = useState(() => getProjectCreate(role));
  const [edits, setEdits] = useState<PhaseEdit[]>(() =>
    draft.phases.map((p) => ({
      on: true,
      tasks: p.tasks.map((t) => ({ on: true, type: t.type })),
    })),
  );
  const [template, setTemplate] = useState(false);
  if (!allowedScreen('projects.draft', role)) return <Redirect href="/" />;
  return (
    <DetailPage
      testID="project-draft"
      title={DRAFT.title}
      foot={
        <Foot cancel={DRAFT.rebuild} label={CREATE.create} onPress={() => createProject(notice)} />
      }
    >
      <Soft>
        <HStack className="items-center gap-2">
          <Ai />
          <Text className="flex-1 text-subhead text-foreground">{DRAFT.banner}</Text>
          <Badge variant="warning">
            <BadgeText>{DRAFT.notYet}</BadgeText>
          </Badge>
        </HStack>
      </Soft>
      <Sec
        title={DRAFT.info}
        right={
          <Button variant="link" onPress={() => router.push('/projects/new/form')}>
            <ButtonText>{DRAFT.edit}</ButtonText>
          </Button>
        }
      >
        <Info label={DRAFT.name} value={draft.name} />
        <Info label={DRAFT.desc} value={draft.summary} />
        <Info label={DRAFT.dates} value={draft.dates} />
        <Info label={DRAFT.priority} value={DRAFT.priorityValue} />
        <Info label={DRAFT.members} value={draft.members} />
      </Sec>
      <Text accessibilityRole="header" className="text-headline font-semibold text-foreground">
        {DRAFT.phases}
      </Text>
      <Note>{draft.count}</Note>
      {draft.phases.map((ph, i) => (
        <PhaseCard
          key={ph.name}
          n={i + 1}
          ph={ph}
          e={edits[i] ?? { on: false, tasks: [] }}
          set={(e) => setEdits((s) => s.map((x, j) => (j === i ? e : x)))}
        />
      ))}
      <Note>{DRAFT.typesNote}</Note>
      <CheckRow label={DRAFT.saveTemplate} value={template} onChange={setTemplate}>
        <VStack className="flex-1">
          <Text className="text-body text-foreground">{DRAFT.saveTemplate}</Text>
          <Note>{DRAFT.saveTemplateSub}</Note>
        </VStack>
      </CheckRow>
    </DetailPage>
  );
}
