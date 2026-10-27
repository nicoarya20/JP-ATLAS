// Profile note (prototype profile.note.jsx): the round pill next to the photo, and its input while editing. Tap to type; Done or leaving the
// field saves, an empty note clears it.
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { NOTE_MAX, setProfile, useProfile } from '@/data/profile.store';

import { NOTE } from './profile.strings';

/** The bubble, or its input while editing. */
export function ProfileNote() {
  const { note } = useProfile();
  // null: showing the bubble; a string: editing it.
  const [draft, setDraft] = useState<string | null>(null);
  // Set once Done ended the edit, so the blur that follows does not save twice.
  const done = useRef(false);
  const edit = () => {
    done.current = false;
    setDraft(note);
  };
  const save = () => {
    if (done.current || draft === null) return;
    done.current = true;
    setProfile({ note: draft });
    setDraft(null);
  };
  return (
    <View className="min-w-0 flex-1 items-start">
      {draft === null ? (
        <Pressable
          testID="profile-note"
          accessibilityRole="button"
          accessibilityLabel={note ? NOTE.editLabel(note) : NOTE.addLabel}
          onPress={edit}
          className="min-h-11 justify-center rounded-full bg-muted px-4 py-2"
        >
          <Text className={`text-subhead ${note ? '' : 'text-muted-foreground'}`}>
            {note || NOTE.add}
          </Text>
        </Pressable>
      ) : (
        <Input className="min-h-11 w-full rounded-full">
          <InputField
            testID="profile-note-input"
            aria-label={NOTE.input}
            autoFocus
            value={draft}
            maxLength={NOTE_MAX}
            placeholder={NOTE.placeholder}
            returnKeyType="done"
            onChangeText={setDraft}
            onSubmitEditing={save}
            onBlur={save}
            className="text-subhead"
          />
        </Input>
      )}
    </View>
  );
}
