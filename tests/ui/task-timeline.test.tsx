/**
 * Task timeline (S2-13): user text is escaped, only http(s) becomes a link, a removed account reads
 * "Mantan anggota", and a failed send keeps the draft. C-TSK-1: no raw HTML sink in app/components/tasks.
 */
import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { TimelineItem } from '../../app/components/tasks/TimelineItem';
import {
  activityText,
  isSafeUrl,
  sendKeepingDraft,
  splitLinks,
} from '../../app/components/tasks/task-timeline';
import type { TimelineEntry } from '../../app/lib/tasks-api';
import { TASK_FORMER_MEMBER_LABEL } from '../../server/task/task.limits';
import { renderUi } from '../support/render-ui';

const AT = '2026-10-06T03:00:00.000Z'; // test-only
const comment = (over: Record<string, unknown> = {}) =>
  ({
    kind: 'comment',
    id: 'c-1',
    at: AT,
    author: { id: 'u-2', name: 'Sari' },
    body: 'halo',
    editedAt: null,
    ...over,
  }) as TimelineEntry;

const show = (entry: TimelineEntry, viewerId = 'u-1') =>
  renderUi(<TimelineItem entry={entry} taskRef="7" viewerId={viewerId} canComment />);

describe('timeline text', () => {
  it('escapes markup in a comment instead of rendering it', async () => {
    const html = await show(comment({ body: '<img src=x onerror=alert(1)>' }));
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('keeps line breaks with pre-wrap', async () => {
    expect(await show(comment({ body: 'a\nb' }))).toContain('white-space:pre-wrap');
  });

  it('turns http(s) addresses into safe links and never javascript:', async () => {
    const html = await show(comment({ body: 'lihat https://contoh.id/a dan javascript:alert(1)' }));
    expect(html).toContain('href="https://contoh.id/a"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('href="javascript');
    expect(html).toContain('javascript:alert(1)');
  });

  it('splitLinks drops trailing punctuation and refuses other schemes', () => {
    expect(splitLinks('cek http://a.id/x, ya').map((p) => p.value)).toEqual([
      'cek ',
      'http://a.id/x',
      ', ya',
    ]);
    expect(splitLinks('data:text/html,<b>x</b> ftp://a.id').every((p) => p.kind === 'text')).toBe(
      true,
    );
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('https://a.id')).toBe(true);
  });

  it('shows a removed account as "Mantan anggota"', async () => {
    const html = await show(comment({ author: { id: null, name: TASK_FORMER_MEMBER_LABEL } }));
    expect(html).toContain('Mantan anggota');
  });

  it('offers change and delete only on the viewer’s own comment', async () => {
    expect(await show(comment({ author: { id: 'u-1', name: 'Saya' } }))).toContain(
      'Aksi lain untuk komentar ini',
    );
    expect(await show(comment())).not.toContain('Aksi lain untuk komentar ini');
  });

  it('writes activity as a sentence with labelled values', () => {
    const entry = {
      kind: 'activity',
      id: 'a-1',
      at: AT,
      author: { id: 'u-2', name: 'Sari' },
      action: 'priority_changed',
      payload: { from: 'medium', to: 'high' },
    } as TimelineEntry;
    expect(activityText(entry as Extract<TimelineEntry, { kind: 'activity' }>)).toBe(
      'mengubah prioritas dari Sedang ke Tinggi',
    );
  });

  it('writes a phase move with both names, and a phase removal', () => {
    const base = { kind: 'activity', id: 'a-2', at: AT, author: null, action: 'phase_changed' };
    const text = (payload: object) =>
      activityText({ ...base, payload } as unknown as Extract<TimelineEntry, { kind: 'activity' }>);
    expect(text({ from: 'Desain', to: 'Bangun' })).toBe(
      'memindahkan tugas ke tahapan Bangun (dari Desain)',
    );
    expect(text({ from: null, to: 'Bangun' })).toBe('memindahkan tugas ke tahapan Bangun');
    expect(text({ from: 'Bangun', to: null })).toBe('mengeluarkan tugas dari tahapan Bangun');
  });
});

describe('sendKeepingDraft', () => {
  it('keeps the draft when sending fails and clears it on success', async () => {
    expect(await sendKeepingDraft('tulisan saya', async () => ({ ok: false }))).toBe(
      'tulisan saya',
    );
    expect(await sendKeepingDraft('tulisan saya', async () => ({ ok: true }))).toBe('');
  });

  it('does not send a blank draft', async () => {
    let calls = 0;
    await sendKeepingDraft('   ', async () => {
      calls += 1;
      return { ok: true };
    });
    expect(calls).toBe(0);
  });
});

describe('C-TSK-1 static scan', () => {
  it('has no dangerouslySetInnerHTML or innerHTML in app/components/tasks', () => {
    const dir = path.join(import.meta.dir, '../../app/components/tasks');
    const offenders = readdirSync(dir)
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) =>
        /dangerouslySetInnerHTML|\.innerHTML/.test(readFileSync(path.join(dir, f), 'utf8')),
      );
    expect(offenders).toEqual([]);
  });
});
