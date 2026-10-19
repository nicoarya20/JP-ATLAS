/** Pure helpers behind the dummy Inbox page (Events and Sampah are real in this branch). */
import { describe, expect, it } from 'bun:test';
import { LATEST_NEWS, NEEDS_ACTION } from '../app/components/inbox/inbox.dummy';

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('inbox', () => {
  it('has unique ids and links for every item', () => {
    const all = [...NEEDS_ACTION, ...LATEST_NEWS];
    expect(new Set(ids(all)).size).toBe(all.length);
    for (const i of all) expect(i.to.startsWith('/app/')).toBe(true);
    for (const i of NEEDS_ACTION) expect(i.actionLabel).toBeTruthy();
  });
});
