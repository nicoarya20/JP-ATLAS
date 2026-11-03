// Edit profile's photo (GAP P-5): the current photo, or the one just picked, and the button that opens the phone's
// photo picker. Picking only stages the photo; the form uploads it on Save, so Cancel leaves the old one in place.
import { useState } from 'react';
import { isApiError } from '@/api/errors';
import { FormError } from '@/components/form/form-error';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type PhotoProblem, type PickedPhoto, photoProblem, pickPhoto } from '@/data/profile.photo';

import { PROFILE_PHOTO as F } from './settings.strings';

const PROBLEM: Record<PhotoProblem, string> = {
  unsupported: F.unsupported,
  'too-large': F.tooLarge,
};

/** The server's avatar refusals (`server/api/app-avatar.ts`), by code. */
const REFUSED: Readonly<Record<string, string>> = {
  UNSUPPORTED_TYPE: F.unsupported,
  FILE_TOO_LARGE: F.tooLarge,
  STORAGE_DISABLED: F.storageOff,
};

/** The app's English for a refused photo upload, or null for any other failure. */
export const photoError = (e: unknown): string | null => (isApiError(e) && REFUSED[e.code]) || null;

type Props = {
  name: string;
  /** The saved photo, loadable as is; null draws the initials. */
  image: string | null;
  picked: PickedPhoto | null;
  onPick: (photo: PickedPhoto) => void;
  /** While the form saves: the photo cannot change under it. */
  busy: boolean;
};

/** The photo and its Add/Change button. */
export function ProfilePhoto({ name, image, picked, onPick, busy }: Props) {
  const [opening, setOpening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const shown = picked?.uri ?? image;
  const open = async () => {
    if (opening) return;
    setOpening(true);
    setProblem(null);
    try {
      const photo = await pickPhoto();
      if (!photo) return;
      const why = photoProblem(photo);
      if (why) setProblem(PROBLEM[why]);
      else onPick(photo);
    } catch {
      // Handled: the picker itself failed to open (no reason the person can act on); they may try again.
      setProblem(F.openFailed);
    } finally {
      setOpening(false);
    }
  };
  return (
    <VStack className="items-center gap-2">
      <Avatar
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-20 w-20 bg-accent"
      >
        <AvatarFallbackText className="text-page font-semibold text-accent-foreground">
          {name}
        </AvatarFallbackText>
        {shown ? <AvatarImage testID="profile-edit-photo" source={{ uri: shown }} /> : null}
      </Avatar>
      <Button variant="link" size="sm" isDisabled={busy || opening} onPress={() => void open()}>
        <ButtonText>{shown ? F.change : F.add}</ButtonText>
      </Button>
      {picked && !problem ? (
        <Text className="text-footnote text-muted-foreground">{F.picked}</Text>
      ) : null}
      {problem ? <FormError testID="profile-photo-error">{problem}</FormError> : null}
    </VStack>
  );
}
