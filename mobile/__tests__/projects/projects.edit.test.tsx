// Projects ⑫–⑭ in the route tree against stubbed `/api/app/projects/:id*`: Edit project sends only what changed and
// confirms closing the project, Extend deadline sends the server's category and the reason, Move to Trash names the
// tasks going along and its Undo restores them; whoever the project's `can{}` keeps out goes back to the project.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { resetProjectsQuery } from '../../src/data/projects.api';
import { forgetAllResources } from '../../src/data/resource';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import {
  atlasDetail,
  atlasItem,
  atlasRoutes,
  page,
  recording,
  type Sent,
} from '../helpers/projects-fixtures';
import { openProjects, resetProjectStores } from '../helpers/projects-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
let sent: Sent[] = [];
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};

beforeEach(() => {
  forgetAllResources();
  resetProjectsQuery();
  sent = [];
});
afterEach(() => {
  server?.restore();
  server = null;
});

const DETAIL = '/api/app/projects/p-atlas';
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));

/**
 * The Atlas reads, the list, and `writes` for the requests a screen sends. A new path is matched first; one the reads
 * already have (the detail itself) is answered in its place, after the longer paths under it.
 */
const routes = (writes: AuthRoutes = {}, detail = atlasDetail()): AuthRoutes => {
  const reads: AuthRoutes = {
    '/api/app/projects?': { body: page([atlasItem()]) },
    ...atlasRoutes(detail),
  };
  const fresh = Object.fromEntries(Object.entries(writes).filter(([path]) => !(path in reads)));
  return { ...fresh, ...reads, ...writes };
};

/** The detail path's stub: a write to it (PATCH, DELETE) is recorded and answered with `reply`, a read gets `detail`. */
const detailWrites =
  (reply: { status?: number; body?: unknown }, detail = atlasDetail()) =>
  (url: string, init?: RequestInit) =>
    init?.method && init.method !== 'GET' ? recording(sent, reply)(url, init) : { body: detail };

async function fromDetail(item: string) {
  await openProjects('/projects/p-atlas');
  await fireEvent.press(await screen.findByTestId('project-actions'));
  await fireEvent.press(await screen.findByText(item));
}

describe('Edit project', () => {
  test('Save waits for a change; a new name alone is sent, then back to the project', async () => {
    serve(routes({ [DETAIL]: detailWrites({ body: atlasDetail() }) }));
    await fromDetail('Edit project');
    await waitFor(() => expect(screen).toHavePathname('/projects/p-atlas/edit'));
    const save = await screen.findByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();
    expect(save.props.accessibilityHint).toBe('Nothing has changed yet.');
    await fireEvent.changeText(screen.getByTestId('edit-name'), ' ');
    expect(button('Save changes').props.accessibilityHint).toBe('Enter a project name.');
    await fireEvent.changeText(screen.getByTestId('edit-name'), 'Atlas v2');
    await press('Save changes');
    expect(await screen.findByText('Project updated')).toBeOnTheScreen();
    await waitFor(() => expect(screen).toHavePathname('/projects/p-atlas'));
    expect(sent).toEqual([{ method: 'PATCH', path: DETAIL, body: { name: 'Atlas v2' } }]);
  });

  test('closing the project is confirmed with its impact, then the status is sent', async () => {
    serve(routes({ '/p-atlas/status': recording(sent, { body: atlasDetail() }) }));
    await fromDetail('Edit project');
    await fireEvent.press(await screen.findByRole('button', { name: 'Done' }));
    await press('Save changes');
    const dialog = within(await screen.findByTestId('edit-confirm'));
    expect(
      dialog.getByText(
        '“Atlas Project” becomes Done: it leaves the active projects and stops counting toward deadlines.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(dialog.getByTestId('confirm-action'));
    expect(await screen.findByText('Project updated')).toBeOnTheScreen();
    expect(sent).toEqual([
      { method: 'POST', path: `${DETAIL}/status`, body: { status: 'completed' } },
    ]);
  });

  test("a refusal stays on the form in the server's words", async () => {
    serve(
      routes({
        [DETAIL]: detailWrites({
          status: 422,
          body: { error: 'Nama terlalu panjang.', code: 'VALIDATION' },
        }),
      }),
    );
    await openProjects('/projects/p-atlas/edit');
    await fireEvent.changeText(await screen.findByTestId('edit-name'), 'Atlas v2');
    await press('Save changes');
    expect(await screen.findByTestId('edit-error')).toHaveTextContent('Nama terlalu panjang.');
    expect(screen).toHavePathname('/projects/p-atlas/edit');
  });

  test('someone who may not edit goes back to the project', async () => {
    serve(routes({}, atlasDetail({ can: {} })));
    await openProjects('/projects/p-atlas/edit');
    await waitFor(() => expect(screen).toHavePathname('/projects/p-atlas'));
  });
});

describe('Extend deadline', () => {
  test('Save waits for a later date and a reason; it sends the category and the reason', async () => {
    serve(routes({ '/extend-deadline': recording(sent, { status: 201, body: {} }) }));
    await openProjects('/projects/p-atlas');
    await fireEvent.press(await screen.findByRole('button', { name: 'Extend deadline' }));
    const sheet = within(await screen.findByTestId('project-extend'));
    expect(sheet.getByRole('button', { name: 'Save' }).props.accessibilityHint).toBe(
      'Pick a new deadline.',
    );
    await fireEvent.press(sheet.getByRole('button', { name: 'New deadline, required' }));
    await fireEvent(sheet.getByTestId('extend-next-picker'), 'onChange', {
      nativeEvent: { timestamp: Date.UTC(2026, 10, 14), utcOffset: 0 },
    });
    expect(sheet.getByRole('button', { name: 'Save' }).props.accessibilityHint).toBe(
      'Enter a reason.',
    );
    await fireEvent.press(sheet.getByLabelText('Waiting on others'));
    await fireEvent.changeText(sheet.getByLabelText('Reason, required'), ' Vendor API late ');
    await fireEvent.press(sheet.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Deadline extended')).toBeOnTheScreen();
    expect(sent).toEqual([
      {
        method: 'POST',
        path: `${DETAIL}/extend-deadline`,
        body: { newDueDate: '2026-11-14', reasonCategory: 'dependency', reason: 'Vendor API late' },
      },
    ]);
  });

  test('a done project is not extended: back to the project', async () => {
    serve(routes({}, atlasDetail({ status: 'completed' })));
    await openProjects('/projects/p-atlas/extend');
    await waitFor(() => expect(screen).toHavePathname('/projects/p-atlas'));
  });
});

describe('Move to Trash', () => {
  test('names the tasks going along; the list comes back with Undo, which restores the project', async () => {
    serve(
      routes({
        '/api/app/trash/project/p-atlas/restore': recording(sent, {
          body: { id: 'p-atlas', tasks: 10 },
        }),
        [DETAIL]: detailWrites({ body: { id: 'p-atlas', tasks: 10 } }),
      }),
    );
    await fromDetail('Move to Trash');
    const sheet = within(await screen.findByTestId('project-trash'));
    expect(
      sheet.getByText('“Atlas Project” and its 10 tasks move to the Trash and leave every list.'),
    ).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole('button', { name: 'Move to Trash' }));
    await waitFor(() => expect(screen).toHavePathname('/projects'));
    expect(screen.getByText('Project moved to Trash')).toBeOnTheScreen();
    await press('Undo');
    expect(await screen.findByText('Project restored')).toBeOnTheScreen();
    expect(sent).toEqual([
      { method: 'DELETE', path: DETAIL, body: undefined },
      { method: 'POST', path: '/api/app/trash/project/p-atlas/restore', body: undefined },
    ]);
  });

  test('a refusal stays on the sheet; someone who may not trash goes back to the project', async () => {
    serve(
      routes({
        [DETAIL]: detailWrites({ status: 403, body: { error: 'Ditolak.', code: 'FORBIDDEN' } }),
      }),
    );
    await openProjects('/projects/p-atlas/archive');
    await fireEvent.press(await screen.findByRole('button', { name: 'Move to Trash' }));
    expect(await screen.findByTestId('trash-error')).toHaveTextContent('Ditolak.');
    server?.restore();
    forgetAllResources();
    serve(routes({}, atlasDetail({ can: { update: true, trash: 'ROLE_CANNOT_TRASH' } })));
    await openProjects('/projects/p-atlas/archive');
    await waitFor(() => expect(screen).toHavePathname('/projects/p-atlas'));
  });
});
