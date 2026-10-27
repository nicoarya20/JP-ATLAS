// What to say when the server refuses a write. Its own sentence is shown as it came (K5): it is in
// Indonesian while the rest of this screen is in English, which the user chose over two wordings of
// the same refusal that would drift apart. One honest line covers a failure that carried no message.
import { isApiError } from '@/api/errors';

import { S } from '../tasks.strings';

/** The message to show for a failed write. */
export const whyFailed = (cause: unknown): string =>
  (isApiError(cause) ? cause.message : '') || S.detail.failed;
