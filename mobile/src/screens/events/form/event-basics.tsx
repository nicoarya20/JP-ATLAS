// Fields both event forms share (prototype events.new.jsx Basics): title, date, start and end,
// location, guests. Save stays disabled while the title is empty or the end is not after the start;
// both say why (UX §5): the title once it was touched, the time range at once, with End marked
// invalid.
//
// The guest picker asks the server (`GET /api/app/events/people`), which answers a capped page, so
// it is a search box and not the whole team: typing narrows it. Guests may only be changed when the
// server says `manageParticipants`, which is why `creatorId` and `editing` come in.
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { Seg } from '@/components/form/seg';
import { SelectField } from '@/components/form/select-field';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { eventPeopleResource, syncEventPeople } from '@/data/events.api';
import { dateLabel } from '@/data/events.dates';
import { type EventFormFields, formDates, MODES, TIMES, validateEvent } from '@/data/events.form';

import { FORM } from '../events.strings';
import { ADDED } from '../events.strings.added';
import { EvField } from '../parts/event-field';
import { Two } from '../parts/event-parts';

const TIME_OPTIONS = TIMES.map((t) => ({ value: t, label: t }));

export type FormProps = { f: EventFormFields; set: (patch: Partial<EventFormFields>) => void };

/** Date picks; an edited event dated before today keeps its own date on top. */
const dateOptions = (date: string, ahead = formDates()) =>
  ahead.some((d) => d.value === date) ? ahead : [{ value: date, label: dateLabel(date) }, ...ahead];

/** Guest pill; tap removes the person, except the creator. */
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

type BasicsProps = FormProps & { creatorId: string; editing: boolean };

/** Title through guests; the creator stays a guest. */
export function EventBasics({ f, set, creatorId }: BasicsProps) {
  const [touched, setTouched] = useState(false);
  const [find, setFind] = useState('');
  const people = eventPeopleResource.use();
  const { timeOk } = validateEvent(f);

  useEffect(() => {
    void syncEventPeople(find);
  }, [find]);

  const picked = new Set(f.guests.map((g) => g.userId));
  const left = (people.data ?? []).filter((p) => !picked.has(p.id));
  return (
    <>
      <Field
        label={FORM.title}
        required
        value={f.title}
        placeholder={FORM.titlePlaceholder}
        onChangeText={(title) => {
          setTouched(true);
          set({ title });
        }}
        onBlur={() => setTouched(true)}
        error={touched && !f.title.trim() ? ADDED.titleMissing : undefined}
        testID="event-title"
      />
      <EvField label={FORM.date} required named>
        <SelectField
          label={FORM.date}
          required
          options={dateOptions(f.date)}
          value={f.date}
          onChange={(date) => set({ date })}
        />
      </EvField>
      <Two>
        <EvField label={FORM.start} named>
          <SelectField
            label={FORM.start}
            options={TIME_OPTIONS}
            value={f.start}
            onChange={(start) => set({ start })}
          />
        </EvField>
        <EvField label={FORM.end} named>
          <SelectField
            label={FORM.end}
            options={TIME_OPTIONS}
            value={f.end}
            onChange={(end) => set({ end })}
            error={timeOk ? undefined : FORM.timeError}
            testID="event-end"
          />
        </EvField>
      </Two>
      {!timeOk && <FormError testID="event-time-error">{FORM.timeError}</FormError>}
      <EvField label={FORM.location} hint={FORM.locationHint} named>
        <Seg
          kind="radio"
          label={FORM.location}
          items={MODES}
          value={MODES.indexOf(f.mode)}
          onChange={(i) => set({ mode: MODES[i] ?? MODES[0] })}
        />
        {f.mode === 'Online' ? (
          <Field
            label={FORM.link}
            inputMode="url"
            value={f.meetingUrl}
            onChangeText={(meetingUrl) => set({ meetingUrl })}
            testID="event-link"
          />
        ) : (
          <Field
            label={FORM.place}
            value={f.place}
            onChangeText={(place) => set({ place })}
            testID="event-place"
          />
        )}
      </EvField>
      <EvField label={FORM.attendees}>
        <HStack className="flex-wrap gap-2">
          {f.guests.map((g) => (
            <Person
              key={g.userId || g.name}
              name={g.name}
              onRemove={
                g.userId === creatorId
                  ? undefined
                  : () => set({ guests: f.guests.filter((x) => x.userId !== g.userId) })
              }
            />
          ))}
        </HStack>
        <Field
          label={FORM.findPerson}
          value={find}
          placeholder={FORM.findPersonPlaceholder}
          onChangeText={setFind}
          testID="event-find-person"
        />
        {left.length > 0 && (
          <SelectField
            label={FORM.addPerson}
            value=""
            options={[
              { value: '', label: FORM.addPerson },
              ...left.map((p) => ({ value: p.id, label: p.name })),
            ]}
            onChange={(id) => {
              const person = left.find((p) => p.id === id);
              if (person) set({ guests: [...f.guests, { userId: person.id, name: person.name }] });
            }}
          />
        )}
      </EvField>
    </>
  );
}
