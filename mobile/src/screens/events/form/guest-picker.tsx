// Guest search of the event form on `GET /api/app/events/people` (the team picker: the first names, A–Z), after a
// short pause while typing; a row per person with Add. Whoever the form already took is left out. A viewer the
// server does not let search (a Member, gap doc) sees why, in the server's words.
import { useEffect, useState } from 'react';

import { isApiError } from '@/api/errors';
import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SearchField } from '@/components/search/search-field';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { writeError } from '@/components/state/write-error';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { searchEventPeople } from '@/data/events.api';
import type { EventPersonWire } from '@/data/events.wire';

import { FORM } from '../events.strings';
import { Note } from '../parts/event-parts';
import { useDebounced } from '../parts/use-debounced';

type Answer = { items: EventPersonWire[] | null; error: string | null };

type GuestPickerProps = {
  exclude: readonly string[];
  onPick: (person: EventPersonWire) => void;
};

/** The search and its results; the first names show before anything is typed. */
export function GuestPicker({ exclude, onPick }: GuestPickerProps) {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const [again, setAgain] = useState(0);
  const [answer, setAnswer] = useState<Answer>({ items: null, error: null });
  // biome-ignore lint/correctness/useExhaustiveDependencies: `again` only asks the same search again
  useEffect(() => {
    let live = true;
    setAnswer((a) => ({ items: a.items, error: null }));
    searchEventPeople(q).then(
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
  }, [q, again]);
  const rows = answer.items?.filter((p) => !exclude.includes(p.id)) ?? null;
  return (
    <VStack testID="guest-picker" className="gap-3">
      <SearchField placeholder={FORM.findPerson} value={text} onChangeText={setText} keep />
      {answer.error ? (
        <FailedState
          testID="guest-picker-failed"
          message={answer.error}
          onRetry={() => setAgain((n) => n + 1)}
        />
      ) : rows === null ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <Note>{q ? FORM.nobodyFound : FORM.nobodyLeft}</Note>
      ) : (
        rows.map((p) => (
          <HStack key={p.id} testID={`guest-pick-${p.id}`} className="items-center gap-3">
            <PersonAvatar name={p.name} size="sm" />
            <VStack className="flex-1">
              <Text className="text-body">{p.name}</Text>
              {!!p.jobTitle && <Note>{p.jobTitle}</Note>}
            </VStack>
            <Button
              size="sm"
              variant="outline"
              accessibilityLabel={FORM.addGuest(p.name)}
              onPress={() => onPick(p)}
            >
              <ButtonText>{FORM.add}</ButtonText>
            </Button>
          </HStack>
        ))
      )}
    </VStack>
  );
}
