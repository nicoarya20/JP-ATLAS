// Pickers New task · Fill form and Edit task share (prototype tasks.form.jsx, tasks.edit.jsx): due date, priority chips,
// Type beside Phase (Phase only for a project with phases), the Show more / Show less link, and the form state hook.
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';

import { Chips } from '@/components/form/chips';
import { DateField } from '@/components/form/date-field';
import { SelectField } from '@/components/form/select-field';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { TODAY } from '@/data/sample';
import type { Option, TaskForm } from '@/data/tasks.form';
import { PRIORITIES, type TaskPriority, type TaskType, TYPES } from '@/data/tasks.shared';

import { Labelled } from '../parts/labelled';
import { F } from '../tasks.strings';

const TYPE_OPTIONS = TYPES.map(([value, label]) => ({ value, label }));

/** Form state with a setter per field: `set('title')(text)`. */
export function useTaskForm(initial: () => TaskForm) {
  const [f, setF] = useState(initial);
  const set =
    <K extends keyof TaskForm>(k: K) =>
    (v: TaskForm[K]) =>
      setF((s) => ({ ...s, [k]: v }));
  return { f, setF, set };
}

/** A labelled date (the kit DateField has no visible label). */
export function DateEdit({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  return (
    <Labelled label={label}>
      <DateField label={label} value={value} onChange={onChange} initial={TODAY} />
    </Labelled>
  );
}

export function PriorityEdit({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (p: TaskPriority) => void;
}) {
  return (
    <Labelled label={F.priority}>
      <Chips
        label={F.priority}
        items={PRIORITIES}
        value={PRIORITIES.indexOf(value)}
        onChange={(i) => onChange(PRIORITIES[i] ?? value)}
      />
    </Labelled>
  );
}

type TypePhaseProps = {
  type: TaskType;
  phase: string;
  /** null for a project without phases. */
  phases: readonly Option[] | null;
  onType: (t: TaskType) => void;
  onPhase: (p: string) => void;
};

export function TypePhaseEdit({ type, phase, phases, onType, onPhase }: TypePhaseProps) {
  return (
    <HStack className="gap-3">
      <Labelled label={F.type}>
        <SelectField
          label={F.type}
          options={TYPE_OPTIONS}
          value={type}
          onChange={onType}
          testID="field-type"
        />
      </Labelled>
      {phases && (
        <Labelled label={F.phase}>
          <SelectField
            label={F.phase}
            options={phases}
            value={phase}
            onChange={onPhase}
            testID="field-phase"
          />
        </Labelled>
      )}
    </HStack>
  );
}

/** "Show more" / "Show less" with its chevron, a violet link that folds the extra fields. */
export function MoreToggle({ more, onToggle }: { more: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: more }}
      onPress={onToggle}
      className="min-h-11 flex-row items-center gap-1 self-start"
      testID="form-more"
    >
      <Text className="text-subhead font-bold text-atlas">{more ? F.less : F.more}</Text>
      <Icon as={more ? ChevronUp : ChevronDown} size="sm" className="text-atlas" />
    </Pressable>
  );
}
