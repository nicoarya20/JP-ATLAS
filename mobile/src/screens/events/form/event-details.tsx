// "Add more details" of the event form (prototype events.new.jsx Details): type, project, agenda (one item per line),
// repeat and reminder. The reminder picker stays a notice in Phase 1, as in the prototype.
import { ChevronDown } from 'lucide-react-native';

import { Chips } from '@/components/form/chips';
import { Field } from '@/components/form/field';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { REPEATS, TYPES } from '@/data/events.shared';
import { PROJECTS } from '@/data/sample';
import type { Repeat } from '@/data/sample/events.extra';

import { FORM } from '../events.strings';
import { EvField, Note, Two } from '../parts/event-parts';
import type { FormProps } from './event-basics';

const PROJECT_OPTIONS = PROJECTS.map((p) => ({ value: p.id, label: p.name }));
const REPEAT_OPTIONS = REPEATS.map(([label, value]) => ({ value, label }));

type EventDetailsProps = FormProps & { agenda: string; onAgenda: (text: string) => void };

/** The details block; `agenda` is the form's text, split into items on Save. */
export function EventDetails({ f, set, agenda, onAgenda }: EventDetailsProps) {
  const notice = useNotice();
  return (
    <>
      <EvField label={FORM.type}>
        <Chips
          label={FORM.type}
          items={TYPES}
          value={TYPES.indexOf(f.type)}
          onChange={(i) => set({ type: TYPES[i] ?? TYPES[0] })}
        />
      </EvField>
      <EvField label={FORM.project} hint={FORM.projectHint}>
        <SelectField
          label={FORM.project}
          options={PROJECT_OPTIONS}
          value={f.project}
          onChange={(project) => set({ project })}
        />
      </EvField>
      <Field label={FORM.agenda} multiline value={agenda} onChangeText={onAgenda} />
      <Two>
        <EvField label={FORM.repeat}>
          <SelectField<Repeat | ''>
            label={FORM.repeat}
            options={REPEAT_OPTIONS}
            value={f.repeat}
            onChange={(repeat) => set({ repeat })}
          />
        </EvField>
        <EvField label={FORM.reminder}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={FORM.reminder}
            accessibilityValue={{ text: FORM.reminderValue }}
            onPress={() => notice(FORM.reminderNotice)}
            className="min-h-11 flex-row items-center gap-2 rounded-control border border-input bg-card px-3"
          >
            <Text numberOfLines={1} className="flex-1 text-body text-foreground">
              {FORM.reminderValue}
            </Text>
            <Icon as={ChevronDown} className="text-muted-foreground" />
          </Pressable>
        </EvField>
      </Two>
      <Note>{FORM.minutesNote}</Note>
    </>
  );
}
