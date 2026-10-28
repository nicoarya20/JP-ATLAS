// The sentence a failed write shows (UX §3), shared by every module that writes: the app's English for a code it
// knows (caps.messages), else the server's own sentence (K5), else "Try again".
import { isApiError } from '@/api/errors';
import { CONFIRM_ACTION } from '@/components/confirm/use-confirm-action';
import { CAP_UNKNOWN, capMessage } from '@/data/caps.messages';

/** Why a write failed: the app's English for a code it knows, else the server's own sentence, else "Try again". */
export function writeError(e: unknown): string {
  if (!isApiError(e)) return CONFIRM_ACTION.failed;
  const known = capMessage(e.code);
  if (known !== CAP_UNKNOWN) return known;
  return e.message || CONFIRM_ACTION.failed;
}
