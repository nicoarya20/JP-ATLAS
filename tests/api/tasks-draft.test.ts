/** POST /app/tasks/draft (A1): drafts from a story: people by code, dates by code, kinds and priorities from the app, nothing saved. */
import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { task, taskActivity } from '../../server/db/schema';
import { freezeAt } from '../support/clock';
import { installDraftHarness, modelDraft } from '../support/draft-harness';

const { auth, f, world, draft, answerWith } = installDraftHarness('tddraft');

describe('drafts', () => {
  it('turns one paragraph about two people into two drafts, dates computed by the code', async () => {
    const w = await world();
    auth.as(w.rina);
    answerWith([
      modelDraft({
        title: 'Perbaiki halaman login',
        assignee: 'Rina',
        due: { kind: 'offset', days: 1 },
        priority: 'high',
        kind: 'bug',
      }),
      modelDraft({
        title: 'Siapkan data uji',
        assignee: 'Dodi',
        due: { kind: 'weekday', weekday: 'fri', next: false },
        kind: 'Tugas',
      }),
    ]);
    const res = await draft(w.proj.id);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['drafts', 'question']);
    expect(res.body.question).toBeNull();
    expect(res.body.drafts).toEqual([
      {
        title: 'Perbaiki halaman login',
        assigneeId: w.rina.id,
        assigneeNote: null,
        dueDate: '2026-10-08',
        priority: 'high',
        kindId: w.proj.kinds.issue,
        description: null,
      },
      {
        title: 'Siapkan data uji',
        assigneeId: w.dodi.id,
        assigneeNote: null,
        dueDate: '2026-10-09',
        priority: null,
        kindId: w.proj.kinds.task,
        description: null,
      },
    ]);
  });

  it('resolves "besok" and "Jumat" against the injected clock, not a fixed day', async () => {
    const w = await world();
    auth.as(w.rina);
    answerWith([
      modelDraft({ due: { kind: 'offset', days: 1 } }),
      modelDraft({ due: { kind: 'weekday', weekday: 'fri', next: false } }),
      modelDraft({ due: { kind: 'weekday', weekday: 'fri', next: true } }),
    ]);
    const due = async () =>
      (await draft(w.proj.id)).body.drafts.map((d: { dueDate: string }) => d.dueDate);
    expect(await due()).toEqual(['2026-10-08', '2026-10-09', '2026-10-16']);
    freezeAt(new Date('2026-10-09T03:00:00Z')); // the Friday itself
    expect(await due()).toEqual(['2026-10-10', '2026-10-09', '2026-10-16']);
    freezeAt(new Date('2026-12-31T03:00:00Z')); // year end
    expect((await due())[0]).toBe('2027-01-01');
  });

  it('asks one question with candidates when a name fits two members', async () => {
    const w = await world();
    const rina2 = await f.user({ name: 'Rina Pratiwi' }); // test-only
    const proj = await f.project({
      lead: w.lead,
      members: [
        [w.rina, 'member'],
        [rina2, 'member'],
        [w.dodi, 'member'],
      ],
    });
    auth.as(w.lead);
    answerWith([
      modelDraft({ title: 'A', assignee: 'Rina' }),
      modelDraft({ title: 'B', assignee: 'Dodi' }),
    ]);
    const res = await draft(proj.id);
    expect(res.status).toBe(200);
    expect(res.body.drafts[0]).toMatchObject({ assigneeId: null });
    expect(res.body.drafts[0].assigneeNote).toContain('Rina');
    expect(res.body.drafts[1].assigneeId).toBe(w.dodi.id);
    expect(res.body.question.text).toBe('Rina yang mana?');
    expect(res.body.question.draftIndexes).toEqual([0]);
    expect(res.body.question.options.map((o: { id: string }) => o.id).sort()).toEqual(
      [w.rina.id, rina2.id].sort(),
    );
    expect(Object.keys(res.body.question.options[0]).sort()).toEqual(['id', 'label']);
  });

  it('gives no assignee and a note for a name outside the project or a Pemantau', async () => {
    const w = await world();
    auth.as(w.rina);
    answerWith([
      modelDraft({ assignee: 'Budi' }),
      modelDraft({ assignee: 'Wawan' }),
      modelDraft({ assignee: 'Orang Luar' }),
    ]);
    const res = await draft(w.proj.id);
    expect(res.body.question).toBeNull();
    for (const d of res.body.drafts) expect(d.assigneeId).toBeNull();
    expect(res.body.drafts[0].assigneeNote).toBe('"Budi" bukan Pengelola atau Anggota proyek ini.');
    expect(res.body.drafts[1].assigneeNote).toContain('Wawan');
    expect(res.body.drafts[2].assigneeNote).toContain('Orang Luar');
  });

  it('takes "saya" as the caller and ignores ids or fields the model invents', async () => {
    const w = await world();
    auth.as(w.rina);
    answerWith([
      modelDraft({ assignee: '@me' }),
      modelDraft({
        assignee: w.outsider.id,
        assigneeId: w.outsider.id,
        status: 'done',
        projectId: 'other',
      }),
    ]);
    const res = await draft(w.proj.id);
    expect(res.body.drafts[0].assigneeId).toBe(w.rina.id);
    expect(res.body.drafts[1].assigneeId).toBeNull();
    expect(Object.keys(res.body.drafts[1]).sort()).toEqual(
      [
        'assigneeId',
        'assigneeNote',
        'description',
        'dueDate',
        'kindId',
        'priority',
        'title',
      ].sort(),
    );
  });

  it('maps priority and kind to values the app has, otherwise null', async () => {
    const w = await world();
    auth.as(w.rina);
    answerWith([
      modelDraft({ priority: 'mendesak sekali', kind: 'Epic' }),
      modelDraft({ priority: 'critical', kind: 'IDE' }),
    ]);
    const res = await draft(w.proj.id);
    expect(res.body.drafts[0]).toMatchObject({ priority: null, kindId: null });
    expect(res.body.drafts[1]).toMatchObject({ priority: 'critical', kindId: w.proj.kinds.idea });
  });

  it('passes an open question when the story gives nothing to draft', async () => {
    const w = await world();
    auth.as(w.rina);
    answerWith([], 'Tugas apa yang dimaksud?');
    const res = await draft(w.proj.id);
    expect(res.body).toEqual({
      drafts: [],
      question: { text: 'Tugas apa yang dimaksud?', draftIndexes: [] },
    });
  });

  it('saves nothing: no task and no activity row appears', async () => {
    const w = await world();
    auth.as(w.rina);
    answerWith([modelDraft({ title: 'Satu', assignee: 'Dodi' })]);
    expect((await draft(w.proj.id)).status).toBe(200);
    expect(await db.select().from(task).where(eq(task.projectId, w.proj.id))).toEqual([]);
    const created = await db.select().from(taskActivity).where(eq(taskActivity.actorId, w.rina.id));
    expect(created).toEqual([]);
  });
});
