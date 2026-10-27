// Projects ⑫–⑭ (port of prototype projects.edit.test / projects.archive.test): Edit saves, Extend needs a reason,
// a member role change and a removal ask first (T2), Move to Archive returns to the list with Undo (T1).
//
// What changed in Phase 2: all four are **requests** now. So each test asserts the request that went out — the URL,
// and that a write addressed to a person carries their `userId` rather than their name (K4) — and then what the
// screen did with the answer. Asserting against projects.store instead would only prove the screen talked to
// itself.
//
// The "a Member is sent home" cases stay: `allowedScreen` is a route-level rule about which screens a role may open
// at all, which is separate from the project's own `can{}` and still this app's to enforce.
//
// Gone: "Project settings from the ⋯ menu". The item left the menu with GAP A-12 — `can.manageKinds` exists but no
// /api/app route for task kinds does, so the screen behind it could only ever have shown sample data.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { openProjects, projectCalls, resetProjectStores } from '../helpers/projects-router';
import { answerProjects } from '../helpers/projects-router';
import { DEFAULT_MEMBERS, DODI, ME } from '../helpers/projects-wire';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));
/** Every URL the stub was asked for that was a write to this path fragment. */
const asked = (fragment: string) => projectCalls().filter((u) => u.includes(fragment));

describe('Edit project', () => {
  it('Save changes is off without a name, and off again with nothing changed', async () => {
    await openProjects('/projects/atlas/edit');
    const name = await screen.findByLabelText('Project name, required');
    await fireEvent.changeText(name, ' ');
    expect(button('Save changes')).toBeDisabled();
    // Back to what the server sent: there is nothing to send, so Save stays off.
    await fireEvent.changeText(name, 'Atlas Project');
    expect(button('Save changes')).toBeDisabled();
  });

  it('sends only the field that changed, then says so and goes back', async () => {
    await openProjects('/projects/atlas/edit');
    const name = await screen.findByLabelText('Project name, required');
    await fireEvent.changeText(name, 'Atlas v2');
    await press('Save changes');
    await waitFor(() => expect(screen.getByText('Project updated')).toBeOnTheScreen());
    // One PATCH to the project itself; the status and Lead routes are untouched because neither moved.
    expect(asked('/api/app/projects/atlas').length).toBeGreaterThan(0);
    expect(asked('/status')).toHaveLength(0);
    expect(asked('/lead')).toHaveLength(0);
  });

  it('keeps the form up with the server sentence when a save is refused', async () => {
    // Refused on the status route, which has a URL of its own: a PATCH to the project and the GET
    // that opens this screen are the same URL, so a refusal there would refuse the read as well.
    answerProjects({ failStatus: { status: 422, error: 'Status tidak bisa diubah ke Draft' } });
    await openProjects('/projects/atlas/edit');
    await screen.findByLabelText('Project name, required');
    await fireEvent.press(screen.getByRole('button', { name: 'Draft' }));
    await press('Save changes');
    await waitFor(() =>
      expect(screen.getByText('Status tidak bisa diubah ke Draft')).toBeOnTheScreen(),
    );
    expect(screen.getByTestId('project-edit')).toBeOnTheScreen();
  });

  it('a Member is sent home', async () => {
    await openProjects('/projects/atlas/edit', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});

describe('Extend deadline', () => {
  it('Save waits for a new deadline and a reason, then says Deadline extended', async () => {
    await openProjects('/projects/atlas/extend');
    const sheet = within(await screen.findByTestId('project-extend'));
    // No new deadline yet: Save is off whatever the reason says.
    expect(sheet.getByRole('button', { name: 'Save' })).toBeDisabled();
    await fireEvent.press(sheet.getByTestId('extend-next'));
    await fireEvent(sheet.getByTestId('extend-next-picker'), 'onChange', {
      nativeEvent: { timestamp: Date.UTC(2026, 10, 30), utcOffset: 0 },
    });
    await fireEvent.changeText(sheet.getByLabelText('Reason, required'), 'Client asked');
    await waitFor(() => expect(sheet.getByRole('button', { name: 'Save' })).toBeEnabled());
    await fireEvent.press(sheet.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Deadline extended')).toBeOnTheScreen());
    expect(asked('/extend-deadline').length).toBeGreaterThan(0);
  });

  it('offers the four categories the server stores, and no fifth', async () => {
    await openProjects('/projects/atlas/extend');
    const sheet = within(await screen.findByTestId('project-extend'));
    expect(sheet.getByLabelText('Scope increased')).toBeOnTheScreen();
    expect(sheet.getByLabelText('Waiting on third party')).toBeOnTheScreen();
    expect(sheet.getByLabelText('Short-staffed')).toBeOnTheScreen();
    expect(sheet.getByLabelText('Other')).toBeOnTheScreen();
    // The prototype's fifth option would have been recorded as one of the four above.
    expect(sheet.queryByLabelText('Estimate was off')).not.toBeOnTheScreen();
  });

  it('goes home for a project with no deadline: the route moves one, it cannot set a first', async () => {
    answerProjects({ detail: { dueDate: null } });
    await openProjects('/projects/atlas/extend');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });

  it('a Member is sent home', async () => {
    await openProjects('/projects/atlas/extend', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});

describe('Members tab', () => {
  it('a role change asks first, then addresses the write to the userId', async () => {
    answerProjects({
      memberWrite: (userId) => ({
        items: DEFAULT_MEMBERS.map((m) => (m.userId === userId ? { ...m, role: 'viewer' } : m)),
      }),
    });
    await openProjects('/projects/atlas?tab=members');
    await press(`Project role of ${DODI.name}`);
    // The picker's options sit under its trigger, so its Viewer comes before the "What roles mean" one.
    await waitFor(() => expect(screen.getAllByText('Viewer').length).toBeGreaterThan(1));
    const viewer = screen.getAllByText('Viewer')[0];
    if (!viewer) throw new Error('the role picker shows no Viewer option');
    await fireEvent.press(viewer);
    const dialog = within(await screen.findByTestId('member-confirm'));
    expect(dialog.getByText(`Change ${DODI.name}'s role?`)).toBeOnTheScreen();
    await fireEvent.press(dialog.getByTestId('confirm-action'));
    await waitFor(() => expect(screen.getByText('Role changed')).toBeOnTheScreen());
    expect(asked(`/members/${DODI.id}`).length).toBeGreaterThan(0);
  });

  it('Remove asks first, and the tab reloads into what the server then has', async () => {
    // The stub keeps its own roster: the tab re-reads /members after the write, so a removal that
    // only lived in the write's answer would reappear -- which is the bug this asserts against.
    let roster = [...DEFAULT_MEMBERS];
    answerProjects({
      members: () => roster,
      memberWrite: (userId) => {
        roster = roster.filter((m) => m.userId !== userId);
        return { items: roster };
      },
    });
    await openProjects('/projects/atlas?tab=members');
    await waitFor(() => expect(screen.getByTestId(`member-${DODI.id}`)).toBeOnTheScreen());
    await press(`Remove ${DODI.name}`);
    const dialog = within(await screen.findByTestId('member-confirm'));
    expect(dialog.getByText(`Remove ${DODI.name} from the project?`)).toBeOnTheScreen();
    await fireEvent.press(dialog.getByTestId('confirm-action'));
    await waitFor(() => expect(screen.getByText('Member removed')).toBeOnTheScreen());
    await waitFor(() => expect(screen.queryByTestId(`member-${DODI.id}`)).not.toBeOnTheScreen());
  });

  it("the Lead's own role and removal stay off, and say why", async () => {
    await openProjects('/projects/atlas?tab=members');
    await waitFor(() => expect(screen.getByTestId(`member-${ME.id}`)).toBeOnTheScreen());
    expect(button(`Remove ${ME.name}`)).toBeDisabled();
    expect(button(`Project role of ${ME.name}`)).toBeDisabled();
    expect(button(`Project role of ${ME.name}`).props.accessibilityHint).toBe(
      "The Lead stays Manager and can't be removed.",
    );
    expect(button(`Project role of ${DODI.name}`).props.accessibilityHint).toBeUndefined();
  });

  it('keeps the dialog open with the server sentence when a member write is refused', async () => {
    answerProjects({
      memberWrite: () => ({
        status: 409,
        body: { error: 'Manager terakhir tidak bisa dikeluarkan', code: 'LAST_MANAGER' },
      }),
    });
    await openProjects('/projects/atlas?tab=members');
    await press(`Remove ${DODI.name}`);
    const dialog = within(await screen.findByTestId('member-confirm'));
    await fireEvent.press(dialog.getByTestId('confirm-action'));
    await waitFor(() =>
      expect(screen.getByText('Manager terakhir tidak bisa dikeluarkan')).toBeOnTheScreen(),
    );
    expect(screen.getByTestId('member-confirm')).toBeOnTheScreen();
  });
});

describe('Move to Archive', () => {
  it('names what goes along, then returns to the list with Undo', async () => {
    await openProjects('/projects/atlas/archive');
    const sheet = within(await screen.findByTestId('project-archive'));
    // The count is taskCounts.live: every task not already in the Trash, canceled ones too.
    expect(sheet.getByText(/^“Atlas Project” and its 5 tasks leave every list/)).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole('button', { name: 'Move to Archive' }));
    await waitFor(() => expect(screen).toHavePathname('/projects'));
    expect(screen.getByText('Project moved to Archive')).toBeOnTheScreen();
    expect(asked('/api/app/projects/atlas').length).toBeGreaterThan(0);
  });

  it('Undo asks the server to restore it, and says so', async () => {
    await openProjects('/projects/atlas/archive');
    const sheet = within(await screen.findByTestId('project-archive'));
    await fireEvent.press(sheet.getByRole('button', { name: 'Move to Archive' }));
    await waitFor(() => expect(screen.getByText('Project moved to Archive')).toBeOnTheScreen());
    await press('Undo');
    await waitFor(() => expect(screen.getByText('Project restored')).toBeOnTheScreen());
    expect(asked('/api/app/trash/project/atlas/restore').length).toBeGreaterThan(0);
  });

  it('a refused Undo shows the server sentence rather than guessing why', async () => {
    answerProjects({
      failRestore: { status: 410, error: 'Proyek sudah dihapus permanen' },
    });
    await openProjects('/projects/atlas/archive');
    const sheet = within(await screen.findByTestId('project-archive'));
    await fireEvent.press(sheet.getByRole('button', { name: 'Move to Archive' }));
    await waitFor(() => expect(screen.getByText('Project moved to Archive')).toBeOnTheScreen());
    await press('Undo');
    await waitFor(() =>
      expect(screen.getByText('Proyek sudah dihapus permanen')).toBeOnTheScreen(),
    );
  });

  it('a Member is sent home', async () => {
    await openProjects('/projects/atlas/archive', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});
