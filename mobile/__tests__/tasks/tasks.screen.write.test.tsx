// New task · Just write ✦ against a stubbed POST /api/app/tasks/draft and /api/app/tasks (tasks-fixtures): Compose
// sends the story, the drafts come back to check, fix or drop with the server's note and question as they are, and
// Save adds the kept ones in order, stopping at the first refusal. Without AI (503/502) the story moves to Fill form;
// any other refusal stays on the screen in the server's words.
import { fireEvent, screen, within } from '@testing-library/react-native';

import { type AuthReply, type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { row, tasksServer } from '../helpers/tasks-fixtures';
import { openTasks, resetTaskStores } from '../helpers/tasks-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetTaskStores();
drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
afterEach(() => {
  server?.restore();
  server = null;
});

const bare = {
  assigneeId: null,
  assigneeNote: null,
  dueDate: null,
  priority: null,
  kindId: null,
  description: null,
};
const NOTE = 'Ada lebih dari satu anggota yang cocok dengan "Ni".';
const DRAFTS = {
  drafts: [
    {
      ...bare,
      title: 'Fix the login page',
      assigneeId: 'u-dodi',
      priority: 'high',
      kindId: 'k-bug',
    },
    { ...bare, title: 'Write release notes', assigneeNote: NOTE },
    { ...bare, title: 'Order snacks' },
  ],
  question: {
    text: 'Ni yang mana?',
    options: [
      { id: 'u-nico', label: 'Nico Arya' },
      { id: 'u-dodi', label: 'Dodi Hartono' },
    ],
    draftIndexes: [1],
  },
};

/** The task server with POST /tasks/draft answering `draft`; `asked` keeps each draft request's body. */
function serve(draft: AuthReply) {
  const tasks = tasksServer([row(12, { title: 'Fix SSO login' })]);
  const asked: unknown[] = [];
  const routes: AuthRoutes = {
    '/api/app/tasks/draft': (_url, init) => {
      asked.push(JSON.parse(String(init?.body)));
      return draft;
    },
    ...tasks.routes,
  };
  server = serveAuth(routes);
  return { ...tasks, asked };
}

async function compose(story: string) {
  await openTasks('/tasks/new');
  await fireEvent.changeText(await screen.findByTestId('write-text'), story);
  await fireEvent.press(screen.getByTestId('write-compose'));
}

describe('Just write ✦', () => {
  it('waits for a story, then shows the drafts with the server’s note and question', async () => {
    const s = serve({ body: DRAFTS });
    await openTasks('/tasks/new');
    expect(await screen.findByTestId('write-compose')).toBeDisabled();
    expect(screen.getByTestId('write-compose').props.accessibilityHint).toBe(
      'Write what needs to be done first.',
    );
    expect(screen.queryByTestId('write-save')).not.toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByTestId('write-text'),
      '  Dodi fixes login by tomorrow  ',
    );
    await fireEvent.press(screen.getByTestId('write-compose'));
    expect(await screen.findAllByTestId('write-draft')).toHaveLength(3);
    expect(s.asked).toEqual([{ projectId: 'p-atlas', text: 'Dodi fixes login by tomorrow' }]);
    expect(screen.getByText(NOTE)).toBeOnTheScreen();
    expect(screen.getByText('Type: Bug')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('write-question')).getByText('Ni yang mana?'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('write-save')).toHaveTextContent('Save 3 tasks');
  });

  it('an answer assigns, an unticked draft stays out, and Save adds the rest in order', async () => {
    const s = serve({ body: DRAFTS });
    await compose('Dodi fixes login; Ni writes the notes; snacks');
    await fireEvent.press(await screen.findByRole('button', { name: 'Nico Arya' }));
    expect(screen.queryByText(NOTE)).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Keep draft 3' }));
    await fireEvent.changeText(
      screen.getAllByTestId('draft-title')[0],
      'Fix the login page on iOS',
    );
    expect(screen.getByTestId('write-save')).toHaveTextContent('Save 2 tasks');
    await fireEvent.press(screen.getByTestId('write-save'));
    expect(await screen.findByText('Saved 2 tasks')).toBeOnTheScreen();
    expect(s.writes.map((w) => w.body)).toEqual([
      {
        projectId: 'p-atlas',
        title: 'Fix the login page on iOS',
        priority: 'high',
        assigneeId: 'u-dodi',
        kindId: 'k-bug',
      },
      {
        projectId: 'p-atlas',
        title: 'Write release notes',
        priority: 'medium',
        assigneeId: 'u-nico',
      },
    ]);
    expect(s.rows.map((r) => r.title)).toContain('Write release notes');
  });

  it('a refused draft stops Save there and says how many went in; those leave the list', async () => {
    const bad = { ...bare, title: 'Order snacks', kindId: 'k-gone' };
    const s = serve({
      body: { drafts: [DRAFTS.drafts[0], bad, DRAFTS.drafts[2]], question: null },
    });
    await compose('three things');
    await fireEvent.press(await screen.findByTestId('write-save'));
    expect(
      await screen.findByText(
        'Saved 1 of 3 tasks, then stopped: Jenis tugas ini tidak ada di proyek ini.',
      ),
    ).toBeOnTheScreen();
    expect(s.writes).toHaveLength(2);
    expect(screen.getAllByTestId('write-draft')).toHaveLength(2);
    expect(screen).toHavePathname('/tasks/new');
  });

  it('without AI the story moves to Fill form as the title, with the server’s notice', async () => {
    const off = 'Tulis saja belum diaktifkan di aplikasi ini. Isi form saja.';
    serve({ status: 503, body: { error: off, code: 'AI_DISABLED' } });
    await compose(`  ${'Fix the login page '.repeat(15)}`);
    expect(await screen.findByTestId('form-project')).toBeOnTheScreen();
    expect(screen).toHavePathname('/tasks/new/form');
    expect(await screen.findByText(off)).toBeOnTheScreen();
    const title = screen.getByTestId('field-title').props.value as string;
    expect(title).toHaveLength(200);
    expect(title.startsWith('Fix the login page Fix')).toBe(true);
  });

  it('any other refusal stays on the screen in the server’s words', async () => {
    const slow = 'Terlalu sering memakai Tulis saja. Coba lagi dalam 30 detik, atau isi form saja.';
    serve({ status: 429, body: { error: slow, code: 'RATE_LIMITED', retryAfterSeconds: 30 } });
    await compose('Dodi fixes login');
    expect(await screen.findByTestId('write-error')).toHaveTextContent(slow);
    expect(screen).toHavePathname('/tasks/new');
    expect(screen.queryByTestId('write-draft')).not.toBeOnTheScreen();
  });
});
