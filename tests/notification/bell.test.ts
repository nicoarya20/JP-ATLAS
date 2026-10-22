/** The shell's bell numbers: real counts when the read works, zero and one warning line when it does not. */
import { afterEach, describe, expect, it } from 'bun:test';
import type { Principal } from '../../server/access/types';
import { bellCounts } from '../../server/notification/notification.bell';
import type { Executor } from '../../server/pm/tx';
import { registerProcessLogger } from '../../server/ssr-log';

const P: Principal = { id: 'u-bell', appRole: 'member', impersonating: false }; // test-only
afterEach(() => registerProcessLogger(null));

const broken = {
  select() {
    throw new Error('connection reset');
  },
} as unknown as Executor;

describe('bellCounts', () => {
  it('falls back to zero instead of taking the page down, and logs the reason once', async () => {
    const lines: Array<{ level: string; obj: unknown; msg: string }> = [];
    registerProcessLogger({
      warn: (obj, msg) => lines.push({ level: 'warn', obj, msg }),
      error: (obj, msg) => lines.push({ level: 'error', obj, msg }),
    });
    expect(await bellCounts(P, broken)).toEqual({ action: 0, infoUnread: 0 });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.level).toBe('warn');
    expect(lines[0]?.obj).toEqual({ error: 'connection reset' });
  });

  it('reads the real counts when the database answers', async () => {
    expect(await bellCounts(P)).toEqual({ action: 0, infoUnread: 0 });
  });
});
