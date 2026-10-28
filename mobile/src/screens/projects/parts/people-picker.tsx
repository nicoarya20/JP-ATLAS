// People picker of the Members tab and the New project form: a name search on `GET /api/app/team/picker` (after a
// short pause while typing), then a row per person with an Add button. The server leaves out who is already in the
// project; `exclude` leaves out who the form already took.
import { useEffect, useState } from 'react';

import { isApiError } from '@/api/errors';
import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SearchField } from '@/components/search/search-field';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type PickerPersonWire, searchPeople } from '@/data/projects.picker.api';

import { PICKER } from '../projects.strings';
import { Note } from './display';
import { writeError } from './write-run';

const SEARCH_DEBOUNCE_MS = 300;

type PeoplePickerProps = {
  /** The project people are added to; without it, the New project form asks. */
  projectId?: string;
  exclude?: readonly string[];
  /** Bump to search again (after an add, the server leaves the new member out). */
  refresh?: number;
  /** The person whose Add is running: their button spins, the others wait. */
  busyId?: string | null;
  onPick: (person: PickerPersonWire) => void;
  testID?: string;
};

type Answer = { items: PickerPersonWire[] | null; error: string | null };

function Row({
  p,
  busyId,
  onPick,
}: { p: PickerPersonWire } & Pick<PeoplePickerProps, 'busyId' | 'onPick'>) {
  return (
    <HStack testID={`pick-${p.id}`} className="items-center gap-3">
      <PersonAvatar name={p.name} size="sm" />
      <VStack className="flex-1">
        <Text className="text-body">{p.name}</Text>
        {!!p.jobTitle && <Note>{p.jobTitle}</Note>}
      </VStack>
      <Button
        size="sm"
        variant="outline"
        isDisabled={!!busyId}
        accessibilityLabel={PICKER.addLabel(p.name)}
        onPress={() => onPick(p)}
      >
        {busyId === p.id && <ButtonSpinner />}
        <ButtonText>{PICKER.add}</ButtonText>
      </Button>
    </HStack>
  );
}

/** The search and its results; the first names show before anything is typed. */
export function PeoplePicker({
  projectId,
  exclude = [],
  refresh = 0,
  busyId = null,
  onPick,
  testID,
}: PeoplePickerProps) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [again, setAgain] = useState(0);
  const [answer, setAnswer] = useState<Answer>({ items: null, error: null });
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `refresh` and `again` only ask the same search again
  useEffect(() => {
    let live = true;
    setAnswer((a) => ({ items: a.items, error: null }));
    searchPeople(q, projectId).then(
      (items) => {
        if (live) setAnswer({ items, error: null });
      },
      (e: unknown) => {
        if (live) setAnswer({ items: null, error: writeError(e) });
        // Not a server answer: a bug in this app, raised rather than shown as "no one found".
        if (!isApiError(e)) throw e;
      },
    );
    return () => {
      live = false;
    };
  }, [q, projectId, refresh, again]);
  const rows = answer.items?.filter((p) => !exclude.includes(p.id)) ?? null;
  return (
    <VStack testID={testID} className="gap-3">
      <SearchField placeholder={PICKER.search} value={text} onChangeText={setText} keep />
      {answer.error ? (
        <FailedState message={answer.error} onRetry={() => setAgain((n) => n + 1)} />
      ) : rows === null ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <Note>{q ? PICKER.none : PICKER.noneYet}</Note>
      ) : (
        rows.map((p) => <Row key={p.id} p={p} busyId={busyId} onPick={onPick} />)
      )}
    </VStack>
  );
}
