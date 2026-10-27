// Steps section of the detail (prototype tasks.detail.jsx Step): the task's checklist, where a tick is written to the
// server (B9) and the section is redrawn from what it answers. "+ Add step" is gone for now: adding one needs a field
// to type it in, which this wave did not build, and a button that reports a step it never added is worse than none
// (docs/phase2-gap-disembunyikan.md).
import { Check } from 'lucide-react-native';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { Text } from '@/components/ui/text';
import type { TaskDetailStep, TaskDetailTask } from '@/data/tasks.api.detail';
import { editChecklistItem } from '@/data/tasks.api.write';

import { Sec } from '../parts/task-parts';
import { whyFailed } from '../parts/write-failed';

function Step({ task, step }: { task: string | number; step: TaskDetailStep }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  // No optimistic tick: the box follows the server's answer, so it never shows a state the server
  // refused. It is disabled while the request is out, which is the feedback for the wait (UX §2).
  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      await editChecklistItem(task, step.id, { isDone: next });
    } catch (cause) {
      notice(whyFailed(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Checkbox
      value={step.id}
      aria-label={step.text}
      isChecked={step.done}
      isDisabled={busy}
      onChange={toggle}
      className="min-h-11 gap-3"
    >
      <CheckboxIndicator>
        <CheckboxIcon as={Check} />
      </CheckboxIndicator>
      <CheckboxLabel className="flex-1 text-subhead">{step.text}</CheckboxLabel>
    </Checkbox>
  );
}

/** Steps section, when the task has one. */
export function DetailSteps({
  task,
  steps,
}: {
  task: string | number;
  steps: TaskDetailTask['steps'];
}) {
  if (!steps) return null;
  return (
    <Sec title={steps.title}>
      {steps.items.map((s) => (
        <Step key={s.id} task={task} step={s} />
      ))}
      {steps.empty && <Text className="text-footnote text-muted-foreground">{steps.empty}</Text>}
    </Sec>
  );
}
