// Fields both event forms share (prototype events.new.jsx Basics): title, date, start and end, location, attendees.
import { X } from 'lucide-react-native';

import { Field } from '@/components/form/field';
import { Seg } from '@/components/form/seg';
import { SelectField } from '@/components/form/select-field';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { dateLabel } from '@/data/events.dates';
import { DATES, MODES, TIMES } from '@/data/events.form';
import type { EventFields } from '@/data/events.store';
import { listPeople } from '@/data/people';

import { FORM } from '../events.strings';
import { EvField, Two } from '../parts/event-parts';

const TIME_OPTIONS = TIMES.map((t) => ({ value: t, label: t }));

export type FormProps = { f: EventFields; set: (patch: Partial<EventFields>) => void };

/** Date picks; an edited event dated before today keeps its own date on top. */
const dateOptions = (date: string) =>
  DATES.some((d) => d.value === date) ? DATES : [{ value: date, label: dateLabel(date) }, ...DATES];

/** Attendee pill; tap removes the person, except the creator. */
function Person({ name, onRemove }: { name: string; onRemove?: () => void }) {
  const pill = 'min-h-11 flex-row items-center gap-1 rounded-full bg-muted px-3';
  if (!onRemove) {
    return (
      <HStack className={pill}>
        <Text className="text-subhead text-foreground">{name}</Text>
      </HStack>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={FORM.remove(name)}
      onPress={onRemove}
      className={`${pill} data-[active=true]:opacity-70`}
    >
      <Text className="text-subhead text-foreground">{name}</Text>
      <Icon as={X} size="sm" className="text-muted-foreground" />
    </Pressable>
  );
}

/** Title through attendees; `creator` stays an attendee. */
export function EventBasics({ f, set, creator }: FormProps & { creator: string }) {
  const left = listPeople().filter((p) => !f.attendees.includes(p.name));
  return (
    <>
      <Field
        label={FORM.title}
        required
        value={f.title}
        placeholder={FORM.titlePlaceholder}
        onChangeText={(title) => set({ title })}
        testID="event-title"
      />
      <EvField label={`${FORM.date} *`}>
        <SelectField
          label={FORM.date}
          options={dateOptions(f.date)}
          value={f.date}
          onChange={(date) => set({ date })}
        />
      </EvField>
      <Two>
        <EvField label={FORM.start}>
          <SelectField
            label={FORM.start}
            options={TIME_OPTIONS}
            value={f.start}
            onChange={(start) => set({ start })}
          />
        </EvField>
        <EvField label={FORM.end}>
          <SelectField
            label={FORM.end}
            options={TIME_OPTIONS}
            value={f.end}
            onChange={(end) => set({ end })}
          />
        </EvField>
      </Two>
      <EvField label={FORM.location} hint={FORM.locationHint}>
        <Seg
          items={MODES}
          value={MODES.indexOf(f.mode)}
          onChange={(i) => set({ mode: MODES[i] ?? MODES[0] })}
        />
        <Field
          label={f.mode === 'Online' ? FORM.link : FORM.place}
          value={f.place}
          onChangeText={(place) => set({ place })}
        />
      </EvField>
      <EvField label={FORM.attendees}>
        <HStack className="flex-wrap gap-2">
          {f.attendees.map((n) => (
            <Person
              key={n}
              name={n}
              onRemove={
                n === creator
                  ? undefined
                  : () => set({ attendees: f.attendees.filter((x) => x !== n) })
              }
            />
          ))}
        </HStack>
        {left.length > 0 && (
          <SelectField
            label={FORM.addPerson}
            value=""
            options={[
              { value: '', label: FORM.addPerson },
              ...left.map((p) => ({ value: p.name, label: p.name })),
            ]}
            onChange={(n) => n && set({ attendees: [...f.attendees, n] })}
          />
        )}
      </EvField>
    </>
  );
}
