// Pickers New task · Fill form and Edit task share (prototype tasks.form.jsx, tasks.edit.jsx): the assignee, a date,
// the priority chips, Type beside Phase (Phase only for a project with phases), the Show more / Show less link, and
// the form state hook. The choices are the server's: the project's people, kinds and phases (tasks.form.ts).
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';

import { Chips } from '@/components/form/chips';
import { DateField } from '@/components/form/date-field';
import { SelectField } from '@/components/form/select-field';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useToday } from '@/data/clock';
import {
  NONE,
  type Option,
  PRIORITY_OPTIONS,
  priorityLabel,
  type TaskForm,
} from '@/data/tasks.form';
import type { TaskPriorityWire } from '@/data/tasks.wire';

import { Labelled } from '../parts/labelled';
import { F } from '../tasks.strings';

const PRIORITY_NAMES = PRIORITY_OPTIONS.map(priorityLabel);

/** Form state with a setter per field: `set('title')(text)`. */
export function useTaskForm(initial: () => TaskForm) {
  const [f, setF] = useState(initial);
  const set =
    <K extends keyof TaskForm>(k: K) =>
    (v: TaskForm[K]) =>
      setF((s) => ({ ...s, [k]: v }));
  return { f, setF, set };
}

/** One assignee (T-2) from `people`, "Unassigned" first; disabled with `hint` while the people load. */
export function AssigneeEdit({
  people,
  value,
  onChange,
  hint,
}: {
  people: readonly Option[];
  value: string | null;
  onChange: (id: string | null) => void;
  hint?: string;
}) {
  return (
    <Labelled label={F.assignee}>
      <SelectField
        label={F.assignee}
        options={people}
        value={value ?? NONE}
        onChange={(id) => onChange(id === NONE ? null : id)}
        disabled={!!hint}
        hint={hint}
        testID="field-assignee"
      />
    </Labelled>
  );
}

/** A labelled date (the kit DateField has no visible label); the calendar opens on the server's today. */
export function DateEdit({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  testID?: string;
}) {
  const today = useToday();
  return (
    <Labelled label={label}>
      <DateField label={label} value={value} onChange={onChange} initial={today} testID={testID} />
    </Labelled>
  );
}

export function PriorityEdit({
  value,
  onChange,
}: {
  value: TaskPriorityWire;
  onChange: (p: TaskPriorityWire) => void;
}) {
  return (
    <Labelled label={F.priority}>
      <Chips
        label={F.priority}
        items={PRIORITY_NAMES}
        value={PRIORITY_OPTIONS.indexOf(value)}
        onChange={(i) => onChange(PRIORITY_OPTIONS[i] ?? value)}
      />
    </Labelled>
  );
}

type TypePhaseProps = {
  kindId: string;
  kinds: readonly Option[];
  phaseId: string | null;
  /** null for a project without phases. */
  phases: readonly Option[] | null;
  onKind: (id: string) => void;
  onPhase: (id: string | null) => void;
};

export function TypePhaseEdit({ kindId, kinds, phaseId, phases, onKind, onPhase }: TypePhaseProps) {
  return (
    <HStack className="gap-3">
      {kinds.length > 0 && (
        <Labelled label={F.type}>
          <SelectField
            label={F.type}
            options={kinds}
            value={kindId}
            onChange={onKind}
            testID="field-type"
          />
        </Labelled>
      )}
      {phases && (
        <Labelled label={F.phase}>
          <SelectField
            label={F.phase}
            options={phases}
            value={phaseId ?? NONE}
            onChange={(id) => onPhase(id === NONE ? null : id)}
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
