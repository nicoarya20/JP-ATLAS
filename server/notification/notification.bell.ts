/**
 * The bell numbers for the app shell. The shell loader runs on every page, so a failed count must
 * cost the bell, never the page: it falls back to zero and leaves one line in the process log.
 */
import type { Principal } from '../access/types';
import type { Executor } from '../pm/tx';
import { processLog } from '../ssr-log';
import { type InboxCounts, inboxCounts } from './notification.query';

const NO_COUNTS: InboxCounts = { action: 0, infoUnread: 0 };

/** `inboxCounts`, or zeros when the read fails. The log carries the error text only, never a card or a name. */
export async function bellCounts(p: Principal, exec?: Executor): Promise<InboxCounts> {
  try {
    return await inboxCounts(p, exec);
  } catch (error) {
    processLog(
      'warn',
      { error: error instanceof Error ? error.message : String(error) },
      'inbox bell count failed; the shell shows no number',
    );
    return NO_COUNTS;
  }
}
