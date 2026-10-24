// Projects ⑫ Extend deadline (prototype projects.extend.jsx), from the detail header (Manager / Admin): the current
// deadline, the new one (after it), why, the reason and its impact. Save records nothing yet in Phase 1, like the
// prototype: it closes the sheet with "Deadline extended".
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { fieldName } from '@/components/form/field-name';
import { FormError } from '@/components/form/form-error';
import { RadioList } from '@/components/form/radio-list';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getProjectExtend } from '@/data/projects';
import { addDays } from '@/data/projects.dates';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Labelled, Note, Soft } from '../parts/project-parts';
import { EXTEND } from '../projects.strings';

/** The Extend deadline sheet of the project in the route param `id`; a Member, or a project not listed, goes home. */
export function ExtendProjectScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useNotice();
  const [x] = useState(() => getProjectExtend(id));
  const [next, setNext] = useState<string | null>(x?.next ?? null);
  const [why, setWhy] = useState<string>(EXTEND.reasons[0]);
  const [reason, setReason] = useState(x?.reason ?? '');
  if (!x || !allowedScreen('projects.extend', role)) return <Redirect href="/" />;
  const late = next !== null && next <= x.current;
  const ok = next !== null && !late && !!reason.trim();
  const save = () => {
    router.back();
    notice(EXTEND.saved);
  };
  return (
    <SheetFrame
      testID="project-extend"
      title={EXTEND.title}
      sub={x.name}
      actions={
        <>
          <Button isDisabled={!ok} onPress={save}>
            <ButtonText>{EXTEND.save}</ButtonText>
          </Button>
          <Button variant="outline" onPress={() => router.back()}>
            <ButtonText>{EXTEND.cancel}</ButtonText>
          </Button>
        </>
      }
    >
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
          items={EXTEND.reasons}
          value={why}
          onChange={setWhy}
        />
      </Labelled>
      <Field label={EXTEND.reason} required multiline value={reason} onChangeText={setReason} />
      {x.impact && (
        <Soft>
          <Text className="text-subhead font-semibold">{EXTEND.impact}</Text>
          <Text className="text-subhead">{x.impact}</Text>
        </Soft>
      )}
      <Note>{EXTEND.recorded}</Note>
    </SheetFrame>
  );
}
