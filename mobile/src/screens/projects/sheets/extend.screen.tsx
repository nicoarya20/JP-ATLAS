// Projects ⑫ Extend deadline (prototype projects.extend.jsx), from the detail header while the project is open and
// may be edited: the current deadline, the new one (after it), one of the server's four categories and the reason in
// the manager's words. Save records it in the deadline history and the activity, then closes with "Deadline
// extended"; a refusal (the project closed meanwhile) stays on the sheet. While Save is off it says why.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { isApiError } from '@/api/errors';
import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { fieldName } from '@/components/form/field-name';
import { FormError } from '@/components/form/form-error';
import { RadioList } from '@/components/form/radio-list';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { writeError } from '@/components/state/write-error';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { addDays } from '@/data/projects.dates';
import { getExtendForm, REASON_CHOICES } from '@/data/projects.form';
import { getProjectHead } from '@/data/projects.view';
import { EXTENSION_REASON } from '@/data/projects.view.tabs';
import type { ExtensionReasonWire } from '@/data/projects.wire';
import { extendDeadline } from '@/data/projects.write';
import { Note } from '../parts/display';
import { Labelled } from '../parts/form-bits';
import { ProjectGate } from '../parts/project-gate';
import { EXTEND } from '../projects.strings';
import { WHY } from '../projects.strings.added';

/** The server's `EXTENSION_REASON_MAX`. */
const REASON_MAX = 500;
const REASON_LABELS = REASON_CHOICES.map((c) => c.label);

type Form = NonNullable<ReturnType<typeof getExtendForm>>;

function Extend({ id, x }: { id: string; x: Form }) {
  const notice = useNotice();
  const [next, setNext] = useState<string | null>(null);
  const [category, setCategory] = useState<ExtensionReasonWire>('scope_change');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const late = next !== null && next <= x.current;
  const text = reason.trim();
  const noReason = !text
    ? WHY.reason
    : text.length > REASON_MAX
      ? EXTEND.reasonHint(REASON_MAX)
      : undefined;
  const off = next === null ? WHY.next : late ? EXTEND.after(x.currentLabel) : noReason;
  const save = async () => {
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      await extendDeadline(id, { newDueDate: next, reasonCategory: category, reason: text });
      router.back();
      notice(EXTEND.saved);
    } catch (e) {
      setError(writeError(e));
      if (!isApiError(e)) throw e;
    } finally {
      setBusy(false);
    }
  };
  return (
    <SheetFrame
      testID="project-extend"
      title={EXTEND.title}
      sub={x.name}
      actions={
        <>
          <Button isDisabled={!!off || busy} accessibilityHint={off} onPress={() => void save()}>
            {busy && <ButtonSpinner />}
            <ButtonText>{EXTEND.save}</ButtonText>
          </Button>
          <Button variant="outline" onPress={() => router.back()}>
            <ButtonText>{EXTEND.cancel}</ButtonText>
          </Button>
        </>
      }
    >
      {error && <FormError testID="extend-error">{error}</FormError>}
      <VStack className="gap-1">
        <Text className="text-subhead font-semibold">{EXTEND.current}</Text>
        <Text className="text-headline">{x.currentLabel}</Text>
      </VStack>
      <Labelled label={EXTEND.next} required>
        <DateField
          testID="extend-next"
          label={fieldName(EXTEND.next, true)}
          value={next}
          onChange={setNext}
          initial={addDays(x.current, 1)}
          min={addDays(x.current, 1)}
        />
        {late && <FormError testID="extend-late">{EXTEND.after(x.currentLabel)}</FormError>}
      </Labelled>
      <Labelled label={EXTEND.why} required>
        <RadioList
          label={fieldName(EXTEND.why, true)}
          items={REASON_LABELS}
          value={EXTENSION_REASON[category]}
          onChange={(label) =>
            setCategory(REASON_CHOICES.find((c) => c.label === label)?.value ?? category)
          }
        />
      </Labelled>
      <Field
        label={EXTEND.reason}
        required
        multiline
        value={reason}
        hint={EXTEND.reasonHint(REASON_MAX)}
        onChangeText={(t) => {
          setTouched(true);
          setReason(t);
        }}
        onBlur={() => setTouched(true)}
        error={touched ? noReason : undefined}
        testID="extend-reason"
      />
      <Note>{EXTEND.recorded}</Note>
    </SheetFrame>
  );
}

/** The Extend deadline sheet of the project in the route param `id`; anyone it is not offered to goes back to it. */
export function ExtendProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ProjectGate id={id} allowed={() => getProjectHead(id)?.canExtend === true}>
      {() => <Extend id={id} x={getExtendForm(id) as Form} />}
    </ProjectGate>
  );
}
