// Projects ⑫ Extend deadline (prototype projects.extend.jsx), from the detail header: the current deadline, the new one
// (after it), why and the reason. Save is a real write now (`POST /projects/:id/extend-deadline`), which also writes the
// Deadline history row and the activity line the note promises. While Save is off it says why: no new deadline, one not
// after the current, or no reason (once touched).
//
// Two of the prototype's pieces are gone, and both are listed in docs/phase2-gap-disembunyikan.md:
//
// - **"Impact of change".** There is no preview endpoint (GAP A-10). The only client-side version — counting the tasks
//   on the page this app happens to hold — would be right for a slice and read as a total.
// - **The fifth reason, "Estimate was off".** The server stores four categories, so a fifth option would be recorded
//   as one of the others; the words come from `EXTENSION_REASONS` now, which is the enum itself.
//
// A project with no deadline cannot have one extended — the route moves a date later, it does not set a first one — so
// the sheet has nothing to show and goes back.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { fieldName } from '@/components/form/field-name';
import { FormError } from '@/components/form/form-error';
import { RadioList } from '@/components/form/radio-list';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { WireExtensionReason } from '@/data/projects.api.types';
import { EXTENSION_REASONS, extensionWord } from '@/data/projects.api.values';
import { extendProjectDeadline } from '@/data/projects.api.write';
import { addDays } from '@/data/projects.dates';
import {
  ensureProjectExtend,
  type ProjectExtendView,
  useProjectExtend,
} from '@/data/projects.forms';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Note } from '../parts/display';
import { Labelled } from '../parts/form-bits';
import { EXTEND } from '../projects.strings';
import { WHY } from '../projects.strings.added';

/** The words the radio list shows, in the order the enum is offered in. */
const REASON_OPTIONS = EXTENSION_REASONS.map(extensionWord);

/** The sheet itself, mounted only once the project's current deadline is known. */
function ExtendForm({ id, x }: { id: string; x: ProjectExtendView }) {
  const notice = useNotice();
  const [next, setNext] = useState<string | null>(null);
  const [category, setCategory] = useState<WireExtensionReason>('scope_change');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const late = next !== null && next <= x.current;
  const noReason = reason.trim() ? undefined : WHY.reason;
  const off = next === null ? WHY.next : late ? EXTEND.after(x.currentLabel) : noReason;
  const save = async () => {
    if (!next) return;
    setBusy(true);
    try {
      await extendProjectDeadline(id, {
        newDueDate: next,
        reasonCategory: category,
        reason: reason.trim(),
      });
      router.back();
      notice(EXTEND.saved);
    } catch (e) {
      // The server's own sentence, as it came (K5); the sheet stays up so the reason is not lost.
      notice(e instanceof Error ? e.message : EXTEND.failed);
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
          <Button
            isDisabled={!!off || busy}
            accessibilityState={{ busy, disabled: !!off || busy }}
            accessibilityHint={off}
            onPress={() => void save()}
          >
            {busy && <ButtonSpinner />}
            <ButtonText>{EXTEND.save}</ButtonText>
          </Button>
          <Button variant="outline" isDisabled={busy} onPress={() => router.back()}>
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
          items={REASON_OPTIONS}
          value={extensionWord(category)}
          onChange={(word) =>
            setCategory(EXTENSION_REASONS.find((r) => extensionWord(r) === word) ?? category)
          }
        />
      </Labelled>
      <Field
        label={EXTEND.reason}
        required
        multiline
        value={reason}
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

/** The Extend deadline sheet of the project in the route param `id`; a Member, or a project out of reach, goes home. */
export function ExtendProjectScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { view, phase, error, notFound } = useProjectExtend(id);
  useEffect(() => {
    void ensureProjectExtend(id);
  }, [id]);
  if (!allowedScreen('projects.extend', role)) return <Redirect href="/" />;
  if (notFound) return <Redirect href="/" />;
  // Loaded, but there is no deadline to move: the route cannot set a first one.
  if (!view && phase === 'ready') return <Redirect href="/" />;
  if (!view) {
    return (
      <SheetFrame testID="project-extend-loading" title={EXTEND.title}>
        {phase === 'failed' ? (
          <FailedState
            testID="project-extend-failed"
            message={error?.message}
            onRetry={() => void ensureProjectExtend(id)}
          />
        ) : (
          <LoadingState testID="project-extend-spinner" />
        )}
      </SheetFrame>
    );
  }
  return <ExtendForm key={view.id} id={id} x={view} />;
}
