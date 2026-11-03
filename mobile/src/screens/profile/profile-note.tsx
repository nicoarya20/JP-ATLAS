// Profile note (prototype profile.note.jsx): the round pill next to the photo, and its input while editing. Tap to
// type; Done or leaving the field saves it with `PATCH /api/app/profile` (GAP P-1), an empty note clears it.
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { useNotice } from '@/components/notice/use-notice';
import { writeError } from '@/components/state/write-error';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { PROFILE_MAX } from '@/data/profile.api';
import { saveProfile } from '@/data/profile.write';

import { NOTE } from './profile.strings';

/** The bubble, or its input while editing. `note` is the server's ("" for none). */
export function ProfileNote({ note }: { note: string }) {
  const notice = useNotice();
  // null: showing the bubble; a string: editing it.
  const [draft, setDraft] = useState<string | null>(null);
  // The note just sent, shown until the server's profile comes back with it (or the save fails).
  const [sent, setSent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Set once Done ended the edit, so the blur that follows does not save twice.
  const done = useRef(false);
  // The server's note changed (the save came back, or another device): it replaces what was sent.
  const [seen, setSeen] = useState(note);
  if (seen !== note) {
    setSeen(note);
    setSent(null);
  }
  const shown = sent ?? note;
  const edit = () => {
    done.current = false;
    setDraft(shown);
  };
  const save = async () => {
    if (done.current || draft === null) return;
    done.current = true;
    const next = draft.trim();
    setDraft(null);
    if (next === shown) return;
    setSent(next);
    setSaving(true);
    try {
      await saveProfile({ note: next });
      notice(next ? NOTE.saved : NOTE.cleared);
    } catch (e) {
      // Handled: the old note comes back and the reason is shown; tapping the bubble tries again.
      setSent(null);
      notice(NOTE.failed(writeError(e)));
    } finally {
      setSaving(false);
    }
  };
  return (
    <View className="min-w-0 flex-1 items-start">
      {draft === null ? (
        <Pressable
          testID="profile-note"
          accessibilityRole="button"
          accessibilityLabel={shown ? NOTE.editLabel(shown) : NOTE.addLabel}
          accessibilityState={{ busy: saving, disabled: saving }}
          disabled={saving}
          onPress={edit}
          className={`min-h-11 justify-center rounded-full bg-muted px-4 py-2 ${saving ? 'opacity-60' : ''}`}
        >
          <Text className={`text-subhead ${shown ? '' : 'text-muted-foreground'}`}>
            {shown || NOTE.add}
          </Text>
        </Pressable>
      ) : (
        <Input className="min-h-11 w-full rounded-full">
          <InputField
            testID="profile-note-input"
            aria-label={NOTE.input}
            autoFocus
            value={draft}
            maxLength={PROFILE_MAX.note}
            placeholder={NOTE.placeholder}
            returnKeyType="done"
            onChangeText={setDraft}
            onSubmitEditing={() => void save()}
            onBlur={() => void save()}
            className="text-subhead"
          />
        </Input>
      )}
    </View>
  );
}
