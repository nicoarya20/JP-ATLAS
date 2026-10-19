/**
 * "Tulis saja ✦" on Tugas baru (U1), rendered: the toggle and why it may be off, the story box,
 * the drafts with their save results, and the AI's question. Interaction (Susun, centang, Simpan,
 * Ubah) is covered on the reducer, the batch save and the request in tests/task-draft-*.test.ts,
 * because the repo has no DOM test library to click with.
 */
import { describe, expect, it } from 'bun:test';
import { TaskCreateForm } from '../../app/components/tasks/TaskCreateForm';
import { TaskCreateModes } from '../../app/components/tasks/TaskCreateModes';
import { TaskDraftList } from '../../app/components/tasks/TaskDraftList';
import { TaskDraftQuestion } from '../../app/components/tasks/TaskDraftQuestion';
import { WRITE_COPY } from '../../app/components/tasks/task-draft.copy';
import type { WriteState } from '../../app/components/tasks/task-draft.state';
import { newTaskValues } from '../../app/components/tasks/task-form';
import { TASK_FORM_COPY } from '../../app/components/tasks/task-form.copy';
import type { IsoDate } from '../../server/metrics/types';
import type { TaskFormProject } from '../../server/task/task-form.query';
import { renderUi } from '../support/render-ui';
import { composed, run, STORY, TWO_DRAFTS } from '../support/task-draft-fixtures';

const TODAY = '2026-10-07' as IsoDate; // test-only
const VIEWER = { id: 'u-me', name: 'Dodi' }; // test-only
const KINDS = [
  { id: 'k-task', name: 'Tugas', baseKind: 'task' as const },
  { id: 'k-bug', name: 'Bug', baseKind: 'issue' as const },
]; // test-only
const PROJECTS: TaskFormProject[] = [
  { id: 'p-1', name: 'Atlas', kinds: KINDS, phases: [] },
  { id: 'p-2', name: 'Pindah Kantor', kinds: KINDS, phases: [] },
]; // test-only

const modes = (over: { aiEnabled?: boolean; projectId?: string | null } = {}) =>
  renderUi(
    <TaskCreateModes
      aiEnabled={over.aiEnabled ?? true}
      projects={PROJECTS}
      initialValues={newTaskValues(over.projectId === undefined ? 'p-1' : over.projectId, null)}
      viewer={VIEWER}
      today={TODAY}
      cancelTo="/app/tasks"
      onSubmitted={() => undefined}
    />,
  );

/** The radio input of one segment, as markup. */
function segment(html: string, value: string): string {
  const m = new RegExp(`<input[^>]*type="radio"[^>]*value="${value}"[^>]*>`).exec(html);
  if (!m) throw new Error(`no segment ${value}`);
  return m[0];
}

describe('mode toggle', () => {
  it('opens on Tulis saja when the AI is available', async () => {
    const html = await modes();
    expect(segment(html, 'write')).toContain('checked');
    expect(segment(html, 'write')).not.toContain('disabled');
    expect(html).toContain(WRITE_COPY.boxLabel);
    expect(html).not.toContain(TASK_FORM_COPY.submit);
    expect(html).not.toContain(WRITE_COPY.disabledReason);
  });

  it('opens on Isi form with Tulis saja off and the reason in view when the AI is off', async () => {
    const html = await modes({ aiEnabled: false });
    expect(segment(html, 'write')).toContain('disabled');
    expect(segment(html, 'form')).toContain('checked');
    expect(html).toContain('Tulis saja belum diaktifkan oleh pengelola aplikasi.');
    expect(html).toContain(TASK_FORM_COPY.submit);
    expect(html).not.toContain(WRITE_COPY.boxLabel);
  });
});

describe('story box', () => {
  it('shows the example as a placeholder, never as a value, with the counter and a soon-only voice button', async () => {
    const html = await modes();
    expect(html).toContain(`placeholder="${WRITE_COPY.boxExample}"`);
    expect(html).not.toContain(`>${WRITE_COPY.boxExample}</textarea>`);
    expect(html).toContain('0 dari 2000 karakter');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>)[\s\S])*Rekam suara/);
    expect(html).toContain(WRITE_COPY.voiceSoon);
  });

  it('keeps Susun off and says why: empty story, then no project', async () => {
    const empty = await modes();
    expect(empty).toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>)[\s\S])*Susun ✦/);
    expect(empty).toContain(WRITE_COPY.needText);
    const noProject = await modes({ projectId: null });
    expect(noProject).toContain(WRITE_COPY.needProject);
  });

  it('offers the projects the viewer may write to, shared with the form', async () => {
    const html = await modes();
    expect(html).toContain('value="Atlas"');
    expect(html).toContain(WRITE_COPY.projectHint);
  });
});

const lookup = {
  assigneeName: (id: string | null) =>
    ({ 'u-rina': 'Rina', 'u-dodi': 'Dodi (saya)' })[id ?? ''] ?? null,
  kindName: (id: string | null) => KINDS.find((k) => k.id === id)?.name ?? null,
};

const list = (state: WriteState) =>
  renderUi(
    <TaskDraftList
      items={state.items}
      batch={state.batch}
      {...lookup}
      onToggle={() => undefined}
      onEdit={() => undefined}
      onSave={() => undefined}
      onBack={() => undefined}
    />,
  );

describe('drafts', () => {
  const fresh = run([{ type: 'text', text: STORY }, composed()]);

  it('renders the banner and a card for each of the two drafts', async () => {
    const html = await list(fresh);
    expect(html).toContain('Draf dari AI. Periksa dulu sebelum disimpan.');
    expect(html).toContain('Perbaiki halaman login');
    expect(html).toContain('Siapkan data uji');
    expect(html).toContain('Rina');
    expect(html).toContain('Dodi (saya)');
    expect(html).toContain('8 Oktober 2026');
    expect(html).toContain('9 Oktober 2026');
    expect(html).toContain('Tinggi');
    expect(html).toContain('Sedang');
    expect(html).toContain('Bug');
    expect((html.match(/type="checkbox"/g) ?? []).length).toBe(2);
    expect((html.match(/aria-label="Ubah draf: /g) ?? []).length).toBe(2);
  });

  it('starts with every draft ticked and offers to save them all, nothing saved yet', async () => {
    const html = await list(fresh);
    expect((html.match(/type="checkbox"[^>]*checked/g) ?? []).length).toBe(2);
    expect(html).toContain('Simpan 2 tugas');
    expect(html).not.toContain(WRITE_COPY.savedBadge);
  });

  it('counts only the ticked drafts and turns Simpan off with a reason when none is', async () => {
    const one = await list(run([composed(), { type: 'toggle', id: 'draft-2' }]));
    expect(one).toContain('Simpan 1 tugas');
    const none = await list(
      run([composed(), { type: 'toggle', id: 'draft-1' }, { type: 'toggle', id: 'draft-2' }]),
    );
    expect(none).toContain('Simpan 0 tugas');
    expect(none).toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>)[\s\S])*Simpan 0 tugas/);
    expect(none).toContain(WRITE_COPY.saveNone);
  });

  it('marks a saved draft Tersimpan with a link to it, and locks its box and Ubah', async () => {
    const html = await list(
      run([
        composed(),
        { type: 'saved', id: 'draft-1', task: { id: 't1', number: 12, title: 'x' } },
      ]),
    );
    expect(html).toContain(WRITE_COPY.savedBadge);
    expect(html).toContain('href="/app/tasks/12"');
    expect(html).toContain('Simpan 1 tugas');
    // Ubah tulisan would re-compose and duplicate the saved task, so it is off with its reason.
    expect(html).toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>)[\s\S])*Ubah tulisan/);
    expect(html).toContain(WRITE_COPY.editBackLocked);
  });

  it('shows why one draft failed while the other is saved, and keeps it ticked for a retry', async () => {
    const html = await list(
      run([
        composed(),
        { type: 'saved', id: 'draft-2', task: { id: 't2', number: 3, title: 'y' } },
        { type: 'failed', id: 'draft-1', error: 'Judul tidak valid.' },
      ]),
    );
    expect(html).toContain('Gagal menyimpan: Judul tidak valid.');
    expect(html).toContain(WRITE_COPY.savedBadge);
    expect(html).toContain('Simpan 1 tugas');
  });

  it('shows progress while a batch runs and locks the cards', async () => {
    const html = await list(
      run([composed(), { type: 'batchStarted', total: 2 }, { type: 'saving', id: 'draft-1' }]),
    );
    expect(html).toContain('Menyimpan 1 dari 2 tugas…');
    expect(html).toContain(WRITE_COPY.saving);
    expect(html).toContain(WRITE_COPY.saveBusy);
  });
});

describe('question', () => {
  it('lists the members to choose from as buttons', async () => {
    const html = await renderUi(
      <TaskDraftQuestion
        question={{
          text: 'Rina yang mana?',
          options: [
            { id: 'u-rina-w', label: 'Rina Wulandari' },
            { id: 'u-rina-p', label: 'Rina Pratiwi' },
          ],
          draftIndexes: [0],
        }}
        onAnswer={() => undefined}
        onEditText={() => undefined}
      />,
    );
    expect(html).toContain('Rina yang mana?');
    expect(html).toContain('Rina Wulandari');
    expect(html).toContain('Rina Pratiwi');
    expect(html).not.toContain(WRITE_COPY.editBackAnswer);
  });

  it('asks an open question to be answered in the story, with a way back to it', async () => {
    const html = await renderUi(
      <TaskDraftQuestion
        question={{ text: 'Untuk proyek apa?', draftIndexes: [] }}
        onAnswer={() => undefined}
        onEditText={() => undefined}
      />,
    );
    expect(html).toContain('Untuk proyek apa?');
    expect(html).toContain(WRITE_COPY.questionOpenHint);
    expect(html).toContain(WRITE_COPY.editBackAnswer);
  });

  it('is not part of the fixtures of a plain answer', () => {
    expect(TWO_DRAFTS.question).toBeNull();
  });
});

describe('Ubah', () => {
  it('opens the usual form filled from the draft', async () => {
    const draft = run([composed()]).items[0];
    if (!draft) throw new Error('expected a draft');
    const html = await renderUi(
      <TaskCreateForm
        projects={PROJECTS}
        initialValues={draft.values}
        viewer={VIEWER}
        today={TODAY}
        cancelTo="/app/tasks"
        onCancel={() => undefined}
        onSubmitted={() => undefined}
      />,
    );
    expect(html).toContain('value="Perbaiki halaman login"');
    expect(html).toContain('value="Atlas"');
    expect(html).toContain('value="Tinggi"');
    expect(html).toContain('value="2026-10-08"');
    expect(html).toContain(TASK_FORM_COPY.submit);
  });
});
