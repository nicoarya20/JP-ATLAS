// Steps section of the detail (prototype tasks.detail.jsx Step): the checklist from the server, each tick saved as it is
// made, and "+ Add step" opening a field under the list. Both follow `can.update`: hidden when absent, disabled with the
// reason when the server sends a code (E-6, UX §5). A step being saved spins; a failed one keeps its old tick.
import { Check } from 'lucide-react-native';
import { useState } from 'react';

import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import type { TaskDetailView } from '@/data/tasks.detail';
import { addChecklistStep, STEP_TEXT_MAX, tickChecklistStep } from '@/data/tasks.detail.write';

import { Act, Sec } from '../parts/task-parts';
import { S } from '../tasks.strings';
import { SPOKEN } from '../tasks.strings.added';
import { useDetailRun } from './use-detail-run';

type Step = TaskDetailView['steps']['items'][number];

function StepRow({
  step,
  locked,
  busy,
  onTick,
}: {
  step: Step;
  locked: boolean;
  busy: boolean;
  onTick: (done: boolean) => void;
}) {
  return (
    <HStack className="items-center gap-2">
      <Checkbox
        value={step.id}
        aria-label={step.text}
        isChecked={step.done}
        isDisabled={locked || busy}
        onChange={onTick}
        className="min-h-11 flex-1 gap-3"
      >
        <CheckboxIndicator>
          <CheckboxIcon as={Check} />
        </CheckboxIndicator>
        <CheckboxLabel className="flex-1 text-subhead">{step.text}</CheckboxLabel>
      </Checkbox>
      {busy && <Spinner accessibilityLabel={S.detail.saving} />}
    </HStack>
  );
}

function AddStep({ onAdd, busy }: { onAdd: (text: string) => Promise<boolean>; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!open) {
    return (
      <Act
        kind="link"
        testID="step-add"
        label={S.detail.addStep}
        name={SPOKEN.addStep}
        onPress={() => setOpen(true)}
      />
    );
  }
  const send = async () => {
    if (await onAdd(text.trim())) {
      setText('');
      setOpen(false);
    }
  };
  return (
    <HStack className="items-center gap-2">
      <Input className="flex-1">
        <InputField
          testID="step-text"
          aria-label={S.detail.stepLabel}
          placeholder={S.detail.stepHint}
          value={text}
          maxLength={STEP_TEXT_MAX}
          autoFocus
          onChangeText={setText}
          onSubmitEditing={() => void send()}
        />
      </Input>
      <Act
        testID="step-save"
        label={S.detail.stepSave}
        kind="primary"
        disabled={!text.trim()}
        hint={text.trim() ? undefined : S.detail.stepMissing}
        loading={busy}
        onPress={() => void send()}
      />
    </HStack>
  );
}

/** Steps section of task `view`. */
export function DetailSteps({ view }: { view: TaskDetailView }) {
  const { busy, run } = useDetailRun();
  const { steps } = view;
  const edit = steps.edit;
  if (!steps.items.length && !edit) return null;
  const locked = !edit || !!edit.off;
  const tick = (step: Step, done: boolean) =>
    void run(step.id, async () => {
      await tickChecklistStep(view.no, view.id, step.id, done);
      return undefined;
    });
  return (
    <Sec title={steps.title}>
      {steps.items.map((s) => (
        <StepRow
          key={s.id}
          step={s}
          locked={locked || (!!busy && busy !== s.id)}
          busy={busy === s.id}
          onTick={(done) => tick(s, done)}
        />
      ))}
      {!steps.items.length && (
        <Text className="text-footnote text-muted-foreground">{S.detail.noSteps}</Text>
      )}
      {edit?.off && <Text className="text-footnote text-muted-foreground">{edit.off}</Text>}
      {edit && !edit.off && (
        <AddStep
          busy={busy === 'add'}
          onAdd={(text) => run('add', () => addChecklistStep(view.no, view.id, text))}
        />
      )}
    </Sec>
  );
}
