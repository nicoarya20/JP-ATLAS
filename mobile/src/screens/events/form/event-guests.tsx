// Guests of the event form (prototype events.new.jsx attendees): the creator first and fixed, then each guest as a pill
// that removes them on tap, and "Add person" opening the guest search under it.
import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';

import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { PersonRefWire } from '@/data/events.wire';

import { FORM } from '../events.strings';
import { EvField } from '../parts/event-field';
import type { FormProps } from './event-basics';
import { GuestPicker } from './guest-picker';

const PILL = 'min-h-11 flex-row items-center gap-1 rounded-full bg-muted px-3';

function Pill({ name, onRemove }: { name: string; onRemove?: () => void }) {
  if (!onRemove) {
    return (
      <HStack className={PILL}>
        <Text className="text-subhead text-foreground">{name}</Text>
      </HStack>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={FORM.remove(name)}
      onPress={onRemove}
      className={`${PILL} data-[active=true]:opacity-70`}
    >
      <Text className="text-subhead text-foreground">{name}</Text>
      <Icon as={X} size="sm" className="text-muted-foreground" />
    </Pressable>
  );
}

/** The guest list; `creator` (null while unknown) is always a guest and cannot be removed. */
export function EventGuests({ f, set, creator }: FormProps & { creator: PersonRefWire | null }) {
  const [adding, setAdding] = useState(false);
  const exclude = [...(creator ? [creator.id] : []), ...f.guests.map((g) => g.id)];
  return (
    <EvField label={FORM.attendees}>
      <HStack testID="event-guests" className="flex-wrap gap-2">
        {creator && <Pill name={creator.name} />}
        {f.guests.map((g) => (
          <Pill
            key={g.id}
            name={g.name}
            onRemove={() => set({ guests: f.guests.filter((x) => x.id !== g.id) })}
          />
        ))}
      </HStack>
      {adding ? (
        <GuestPicker
          exclude={exclude}
          onPick={(p) => set({ guests: [...f.guests, { id: p.id, name: p.name }] })}
        />
      ) : (
        <Button
          testID="event-add-guest"
          variant="link"
          className="self-start"
          onPress={() => setAdding(true)}
        >
          <ButtonIcon as={Plus} />
          <ButtonText>{FORM.addPerson}</ButtonText>
        </Button>
      )}
    </EvField>
  );
}
