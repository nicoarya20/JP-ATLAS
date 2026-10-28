// Fields both event forms share (prototype events.new.jsx Basics): title, date, start and end, location. Save stays
// disabled while the title is empty, the end is not after the start, or the meeting link is not a web address; each
// says why (UX §5): the title once it was touched, the time and the link at once.
import { useState } from 'react';

import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { Seg } from '@/components/form/seg';
import { SelectField } from '@/components/form/select-field';
import { today } from '@/data/clock';
import { monthDay } from '@/data/dates';
import { addDays } from '@/data/events.dates';
import { checkEvent, type EventForm, MODES, timeOptions } from '@/data/events.form';
import {
  EVENT_LOCATION_TEXT_MAX,
  EVENT_MEETING_URL_MAX,
  EVENT_TITLE_MAX,
} from '@/data/events.wire';

import { FORM } from '../events.strings';
import { ADDED } from '../events.strings.added';
import { EvField } from '../parts/event-field';
import { Note, Two } from '../parts/event-parts';

export type FormProps = { f: EventForm; set: (patch: Partial<EventForm>) => void };

/** Title through location; a new event cannot start before today (the server's). */
export function EventBasics({ f, set, editing }: FormProps & { editing: boolean }) {
  const [touched, setTouched] = useState(false);
  const { titleOk, timeOk, linkOk } = checkEvent(f);
  const online = f.mode === 'Online';
  return (
    <>
      <Field
        label={FORM.title}
        required
        value={f.title}
        placeholder={FORM.titlePlaceholder}
        onChangeText={(title) => {
          setTouched(true);
          set({ title: title.slice(0, EVENT_TITLE_MAX) });
        }}
        onBlur={() => setTouched(true)}
        error={touched && !titleOk ? ADDED.titleMissing : undefined}
        testID="event-title"
      />
      <EvField label={FORM.date} required named>
        <DateField
          label={FORM.date}
          value={f.date}
          initial={f.date}
          min={editing ? undefined : today()}
          onChange={(date) => set({ date })}
          testID="event-date"
        />
      </EvField>
      <Two>
        <EvField label={FORM.start} named>
          <SelectField
            label={FORM.start}
            options={timeOptions(f.start)}
            value={f.start}
            onChange={(start) => set({ start })}
            testID="event-start"
          />
        </EvField>
        <EvField label={FORM.end} named>
          <SelectField
            label={FORM.end}
            options={timeOptions(f.end)}
            value={f.end}
            onChange={(end) => set({ end })}
            error={timeOk ? undefined : FORM.timeError}
            testID="event-end"
          />
        </EvField>
      </Two>
      {f.span > 0 && <Note>{FORM.endsOn(monthDay(addDays(f.date, f.span)))}</Note>}
      {!timeOk && <FormError testID="event-time-error">{FORM.timeError}</FormError>}
      <EvField label={FORM.location} hint={FORM.locationHint} named>
        <Seg
          kind="radio"
          label={FORM.location}
          items={MODES}
          value={MODES.indexOf(f.mode)}
          onChange={(i) => set({ mode: MODES[i] ?? MODES[0] })}
        />
        {online ? (
          <Field
            label={FORM.link}
            value={f.link}
            inputMode="url"
            autoCapitalize="none"
            onChangeText={(link) => set({ link: link.slice(0, EVENT_MEETING_URL_MAX) })}
            error={linkOk ? undefined : FORM.linkError}
            testID="event-link"
          />
        ) : (
          <Field
            label={FORM.place}
            value={f.place}
            onChangeText={(place) => set({ place: place.slice(0, EVENT_LOCATION_TEXT_MAX) })}
            testID="event-place"
          />
        )}
      </EvField>
    </>
  );
}
