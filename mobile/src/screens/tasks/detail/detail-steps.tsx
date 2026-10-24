// Steps section of the detail (prototype tasks.detail.jsx Step, tasks.detail.screens.jsx): the checklist, whose ticks
// only change on screen in Phase 1, and "+ Add step" on To do (a toast for now).
import { Check } from 'lucide-react-native';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { Text } from '@/components/ui/text';
import type { TaskDetailView } from '@/data/tasks.detail';
import type { TaskStep } from '@/data/tasks.shared';

import { Act, Sec } from '../parts/task-parts';
import { S } from '../tasks.strings';

function Step({ step }: { step: TaskStep }) {
  const [on, setOn] = useState(step.done);
  return (
    <Checkbox
      value={step.text}
      aria-label={step.text}
      isChecked={on}
      onChange={setOn}
      className="min-h-11 gap-3"
    >
      <CheckboxIndicator>
        <CheckboxIcon as={Check} />
      </CheckboxIndicator>
      <CheckboxLabel className="flex-1 text-subhead">{step.text}</CheckboxLabel>
    </Checkbox>
  );
}

/** Steps section, when the variant has one. */
export function DetailSteps({ steps }: { steps: TaskDetailView['steps'] }) {
  const notice = useNotice();
  if (!steps) return null;
  return (
    <Sec title={steps.title}>
      {steps.items.map((s) => (
        <Step key={s.text} step={s} />
      ))}
      {steps.empty && <Text className="text-footnote text-muted-foreground">{steps.empty}</Text>}
      {steps.addStep && (
        <Act kind="link" label={S.detail.addStep} onPress={() => notice(S.detail.stepAdded)} />
      )}
    </Sec>
  );
}
