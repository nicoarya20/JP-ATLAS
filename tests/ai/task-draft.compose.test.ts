/** Composition (A1): names, dates and kinds are resolved by code from a scripted model answer. */
import { describe, expect, it } from 'bun:test';
import { composeDrafts } from '../../server/ai/task-draft.compose';
import { ME_MARKER, type ModelOutput, type RawDraft } from '../../server/ai/task-draft.schema';

const rina1 = { id: 'u-rina-w', name: 'Rina Wulandari' }; // test-only
const rina2 = { id: 'u-rina-p', name: 'Rina Pratiwi' }; // test-only
const dodi = { id: 'u-dodi', name: 'Dodi' }; // test-only
const nico = { id: 'u-nico', name: 'Nico' }; // test-only
const KINDS = [
  { id: 'k-task', name: 'Tugas' },
  { id: 'k-bug', name: 'Bug' },
];
const WED = '2026-10-07'; // the fixed "today": the machine clock is never read

const raw = (over: Partial<RawDraft>): RawDraft => ({
  title: 'T',
  description: null,
  assignee: null,
  due: null,
  priority: null,
  kind: null,
  ...over,
});
const ctx = (members = [dodi, nico], actorId = nico.id) => ({
  members,
  kinds: KINDS,
  actorId,
  today: WED,
});
const out = (drafts: RawDraft[], question: string | null = null): ModelOutput => ({
  drafts,
  question,
});

describe('composeDrafts', () => {
  it('one paragraph, two people: two drafts with the right member, date, priority and kind', () => {
    const res = composeDrafts(
      out([
        raw({
          title: 'Perbaiki halaman login',
          assignee: 'Dodi',
          due: { kind: 'offset', days: 1 },
          priority: 'high',
          kind: 'bug',
        }),
        raw({
          title: 'Siapkan data uji',
          assignee: 'Nico',
          due: { kind: 'weekday', weekday: 'fri', next: false },
        }),
      ]),
      ctx(),
    );
    expect(res.question).toBeNull();
    expect(res.drafts).toEqual([
      {
        title: 'Perbaiki halaman login',
        assigneeId: dodi.id,
        assigneeNote: null,
        dueDate: '2026-10-08',
        priority: 'high',
        kindId: 'k-bug',
        description: null,
      },
      {
        title: 'Siapkan data uji',
        assigneeId: nico.id,
        assigneeNote: null,
        dueDate: '2026-10-09',
        priority: null,
        kindId: null,
        description: null,
      },
    ]);
  });

  it('an ambiguous name leaves the draft unassigned and asks one question with the candidates', () => {
    const res = composeDrafts(
      out([raw({ assignee: 'Rina' }), raw({ assignee: 'Dodi' }), raw({ assignee: 'rina' })]),
      ctx([rina1, rina2, dodi]),
    );
    expect(res.drafts.map((d) => d.assigneeId)).toEqual([null, dodi.id, null]);
    expect(res.drafts[0]?.assigneeNote).toContain('Rina');
    expect(res.question).toEqual({
      text: 'Rina yang mana?',
      options: [
        { id: rina1.id, label: rina1.name },
        { id: rina2.id, label: rina2.name },
      ],
      draftIndexes: [0, 2],
    });
  });

  it('asks about only the first ambiguous name when there are several', () => {
    const lia1 = { id: 'u-lia-1', name: 'Lia Satu' }; // test-only
    const lia2 = { id: 'u-lia-2', name: 'Lia Dua' }; // test-only
    const res = composeDrafts(
      out([raw({ assignee: 'Lia' }), raw({ assignee: 'Rina' })]),
      ctx([rina1, rina2, lia1, lia2]),
    );
    expect(res.question?.text).toBe('Lia yang mana?');
    expect(res.question?.draftIndexes).toEqual([0]);
    expect(res.drafts[1]?.assigneeNote).toContain('Rina');
  });

  it('a name that is not a worker of the project gives no id and a note', () => {
    const res = composeDrafts(out([raw({ assignee: 'Budi' })]), ctx());
    expect(res.drafts[0]).toMatchObject({ assigneeId: null });
    expect(res.drafts[0]?.assigneeNote).toBe('"Budi" bukan Pengelola atau Anggota proyek ini.');
    expect(res.question).toBeNull();
  });

  it('"saya" means the asker when they work in the project, else a note', () => {
    expect(composeDrafts(out([raw({ assignee: ME_MARKER })]), ctx()).drafts[0]?.assigneeId).toBe(
      nico.id,
    );
    const outsider = composeDrafts(
      out([raw({ assignee: ME_MARKER })]),
      ctx([dodi], 'someone-else'),
    );
    expect(outsider.drafts[0]?.assigneeId).toBeNull();
    expect(outsider.drafts[0]?.assigneeNote).toBe('Kamu bukan Pengelola atau Anggota proyek ini.');
  });

  it('a kind outside the project and a date out of range become null', () => {
    const res = composeDrafts(
      out([raw({ kind: 'Epic', due: { kind: 'date', iso: '2026-02-30' } })]),
      ctx(),
    );
    expect(res.drafts[0]).toMatchObject({ kindId: null, dueDate: null });
  });

  it('passes an open question through only when no name is ambiguous', () => {
    expect(composeDrafts(out([], 'Tugas apa maksudnya?'), ctx())).toEqual({
      drafts: [],
      question: { text: 'Tugas apa maksudnya?', draftIndexes: [] },
    });
    const both = composeDrafts(out([raw({ assignee: 'Rina' })], 'Lainnya?'), ctx([rina1, rina2]));
    expect(both.question?.text).toBe('Rina yang mana?');
  });
});
