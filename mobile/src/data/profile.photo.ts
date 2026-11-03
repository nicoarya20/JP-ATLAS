/**
 * Choosing my profile photo (GAP P-5): the phone's own photo picker, cropped square, then a check against the server's
 * limits (`server/api/app-avatar.ts`) so a photo it would refuse is not uploaded first. The server checks the bytes
 * again; the upload itself is `uploadPhoto` in `profile.write.ts`.
 */
import { launchImageLibraryAsync } from 'expo-image-picker';

/** The server's `AVATAR_MAX_BYTES`. */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** The server's `AVATAR_TYPES`; SVG is refused there on purpose. */
const PHOTO_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

/** JPEG compression for the cropped photo: a square phone photo stays well under PHOTO_MAX_BYTES. */
const PHOTO_QUALITY = 0.7;

export type PickedPhoto = { uri: string; name: string; type: string; size: number | null };

/** Why the server would refuse a picked photo. */
export type PhotoProblem = 'unsupported' | 'too-large';

/** The photo picked and cropped from the phone's library, or null when the picker was closed. */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: PHOTO_QUALITY,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  // Cropping saves a JPEG on both platforms; the type is only a hint, the server reads the bytes.
  const type = asset.mimeType ?? 'image/jpeg';
  return {
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    type,
    size: asset.fileSize ?? null,
  };
}

/** What the server would refuse in this photo, or null when it may be uploaded. An unknown size is left to it. */
export function photoProblem(photo: PickedPhoto): PhotoProblem | null {
  if (!PHOTO_TYPES.has(photo.type)) return 'unsupported';
  if (photo.size !== null && photo.size > PHOTO_MAX_BYTES) return 'too-large';
  return null;
}
