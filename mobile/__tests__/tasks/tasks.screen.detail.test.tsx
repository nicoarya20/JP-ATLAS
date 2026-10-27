// Task detail and its sheets, served by GET /api/app/tasks/:ref (port of prototype
// tasks.detail.actions.test, items.open). A status button posts its step and the screen redraws from what the server
// answers; Reopen and Cancel take their reason in a sheet because the server insists on one; Move to Archive sends the
// task to the Trash and offers Undo.
//
// What these tests are really about is that a write *landed*: the assertions read the server's own state afterwards
// (taskApi()), not a store this app wrote hopefully. That is what the first swap could not prove, and why Move to
// Archive was hidden until now.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { SAMPLE_ROWS } from '../helpers/tasks-api-server';
import {
  openTasks,
  resetTaskStores,
  serveTasks,
  settleTasks,
  taskApi,
} from '../helpers/tasks-router';
import { wireActivity, wireComment, wireItem } from '../helpers/tasks-wire';
import { drainToastTimers } from '../helpers/toast-timers';

resetTaskStores();
drainToastTimers();

/** The status the server now holds for a task. */
const status = (no: number) => taskApi().task(no)?.status;
const button = (name: string) => screen.getByRole('button', { name });

async function menuItem(name: string) {
  await fireEvent.press(screen.getByTestId('task-menu'));
  await fireEvent.press(await screen.findByText(name));
}

describe('task detail', () => {
  it('shows what the DTO carries, and nothing it does not', async () => {
    serveTasks(SAMPLE_ROWS, {
      12: {
        description: 'Make the form fit on a phone.',
        checklist: {
          done: 1,
          total: 2,
          items: [
            { id: 's-1', text: 'Measure the form', isDone: true, position: 1 },
            { id: 's-2', text: 'Fix the labels', isDone: false, position: 2 },
          ],
        },
      },
    });
    await openTasks('/tasks/12');
    expect(screen.getByText('#12 · Atlas Project · Bug')).toBeOnTheScreen();
    const facts = within(screen.getByTestId('task-facts'));
    expect(facts.getByText('Nico Pratama')).toBeOnTheScreen();
    expect(facts.getByText('High')).toBeOnTheScreen();
    expect(facts.getByText('Bug')).toBeOnTheScreen();
    expect(screen.getByText('Make the form fit on a phone.')).toBeOnTheScreen();
    expect(screen.getByText('Steps 1/2')).toBeOnTheScreen();
    // No tag row and no evidence: the server has no column for either (A2, A5).
    expect(facts.queryByText('Tags')).toBeNull();
    expect(screen.queryByText(/Evidence/)).toBeNull();
  });

  it('shows the server’s own sentence when the detail fails', async () => {
    taskApi().routes['/api/app/tasks/'] = {
      status: 503,
      body: {
        error: 'Server sedang dalam perbaikan.',
        code: 'MAINTENANCE',
        status: 503,
        requestId: 'r',
      },
    };
    await openTasks('/tasks/12');
    expect(screen.getByTestId('task-failed')).toBeOnTheScreen();
    expect(screen.getByText('Server sedang dalam perbaikan.')).toBeOnTheScreen();
  });

  it('a task that is gone says so — including one in the Trash, which answers 404 too', async () => {
    await openTasks('/tasks/999');
    expect(screen.getByTestId('task-missing')).toBeOnTheScreen();
    expect(screen.getByText('This task is no longer here.')).toBeOnTheScreen();
  });
});

describe('task status steps', () => {
  it('Start working posts the step, and the detail redraws from what the server answers', async () => {
    await openTasks('/tasks/12');
    expect(screen.getByTestId('screen-task')).toBeOnTheScreen();
    await fireEvent.press(button('Start working'));
    await waitFor(() => expect(status(12)).toBe('in_progress'));
    expect(screen).toHavePathname('/tasks/12');
    expect(await screen.findByRole('button', { name: 'Mark done' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Start working' })).not.toBeOnTheScreen();
  });

  it('a refused step keeps the task as it was and says why, in the server’s words', async () => {
    await openTasks('/tasks/12');
    taskApi().routes['/api/app/tasks/'] = {
      status: 409,
      body: {
        error: 'Status tugas sudah berubah. Muat ulang halaman.',
        code: 'WRONG_STATE',
        status: 409,
        requestId: 'r',
      },
    };
    await fireEvent.press(button('Start working'));
    expect(
      await screen.findByText('Status tugas sudah berubah. Muat ulang halaman.'),
    ).toBeOnTheScreen();
    expect(status(12)).toBe('todo');
  });

  it('Reopen asks for a reason of its own, because the server requires one', async () => {
    await openTasks('/tasks/3');
    expect(status(3)).toBe('done');
    await fireEvent.press(button('Reopen'));
    const sheet = within(await screen.findByTestId('screen-task-reopen'));
    expect(sheet.getByTestId('reopen-send')).toBeDisabled();
    await fireEvent.changeText(sheet.getByTestId('reopen-reason'), 'ab');
    expect(sheet.getByTestId('reopen-send')).toBeDisabled();
    await fireEvent.changeText(sheet.getByTestId('reopen-reason'), 'The banner is still broken');
    await fireEvent.press(sheet.getByTestId('reopen-send'));
    await waitFor(() => expect(status(3)).toBe('in_progress'));
    expect(taskApi().task(3)?.reopenCount).toBe(1);
    expect(screen).toHavePathname('/tasks/3');
  });

  it('Cancel sends a category and a note as two fields, then the detail says why with Restore', async () => {
    await openTasks('/tasks/12');
    await menuItem('Cancel task');
    const sheet = within(await screen.findByTestId('screen-task-cancel'));
    const send = sheet.getByTestId('cancel-send');
    expect(send).toBeDisabled();
    await fireEvent.press(sheet.getByRole('radio', { name: 'Other' }));
    expect(send).toBeDisabled();
    await fireEvent.press(sheet.getByRole('radio', { name: 'No longer needed' }));
    expect(send).toBeEnabled();
    await fireEvent.press(send);
    await waitFor(() => expect(status(12)).toBe('canceled'));
    // Two fields, never one joined sentence: the server has no column for that.
    expect(taskApi().task(12)?.cancel).toEqual({ category: 'not_needed', note: null });
    const note = within(await screen.findByTestId('task-note'));
    expect(note.getByText(/No longer needed/)).toBeOnTheScreen();
    await fireEvent.press(note.getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(status(12)).toBe('todo'));
  });

  it('names who canceled it from the timeline, which is where the server keeps the author', async () => {
    await openTasks('/tasks/12');
    await menuItem('Cancel task');
    const sheet = within(await screen.findByTestId('screen-task-cancel'));
    await fireEvent.press(sheet.getByRole('radio', { name: 'No longer needed' }));
    await fireEvent.press(sheet.getByTestId('cancel-send'));
    await waitFor(() => expect(status(12)).toBe('canceled'));
    expect(
      within(await screen.findByTestId('task-note')).getByText(/^Canceled by Nico: /),
    ).toBeOnTheScreen();
  });
});

describe('Move to Archive', () => {
  it('takes the row off the list, and Undo brings it back', async () => {
    await openTasks('/tasks/12');
    expect(await screen.findByTestId('task-menu')).toBeOnTheScreen();
    await menuItem('Move to Archive');
    // Back on the list, and the row is really gone — from the server, not only from this screen.
    await waitFor(() => expect(screen).toHavePathname('/tasks'));
    await waitFor(() => expect(taskApi().trashed()).toEqual([{ id: 't-12', number: 12 }]));
    expect(
      taskApi()
        .rows()
        .some((r) => r.number === 12),
    ).toBe(false);
    expect(screen.queryByText('Fix login layout')).toBeNull();

    await fireEvent.press(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(taskApi().trashed()).toEqual([]));
    // Undo takes the trash entry's id, not the number (B1), so the row really comes back.
    expect(
      taskApi()
        .rows()
        .some((r) => r.number === 12),
    ).toBe(true);
    expect(await screen.findByText('Fix login layout')).toBeOnTheScreen();
  });

  it('a refused archive keeps the task and says why', async () => {
    await openTasks('/tasks/12');
    taskApi().routes['/api/app/tasks/'] = {
      status: 403,
      body: {
        error: 'Kamu tidak boleh menghapus tugas ini.',
        code: 'FORBIDDEN',
        status: 403,
        requestId: 'r',
      },
    };
    await menuItem('Move to Archive');
    expect(await screen.findByText('Kamu tidak boleh menghapus tugas ini.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/tasks/12');
  });

  it('is not offered for a task the server does not allow it for', async () => {
    serveTasks([wireItem({ can: { update: true, cancel: true, comment: true } })]);
    await openTasks('/tasks/12');
    await fireEvent.press(screen.getByTestId('task-menu'));
    expect(await screen.findByText('Cancel task')).toBeOnTheScreen();
    expect(screen.queryByText('Move to Archive')).toBeNull();
  });
});

describe('task detail history', () => {
  it('reads a comment and an activity row as sentences, dated in the team’s zone', async () => {
    // Both instants fall on the UTC day before the one Asia/Jakarta is on: the day a line is filed
    // under has to come from the team's zone, never from UTC (K2).
    taskApi().routes['/timeline'] = {
      body: {
        items: [
          wireComment('Looks good on a phone now', { at: '2026-10-06T19:30:00.000Z' }),
          wireActivity('started', { at: '2026-10-05T23:10:00.000Z' }),
        ],
        nextCursor: 'c-older',
      },
    };
    await openTasks('/tasks/12');
    expect(screen.getByLabelText('Rina: Looks good on a phone now, Oct 7')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nico started working, Oct 6')).toBeOnTheScreen();
    expect(screen.getByTestId('task-history-more')).toBeOnTheScreen();
  });

  it('a comment is written to the server and shows up in the timeline it refetches', async () => {
    await openTasks('/tasks/12');
    await fireEvent.changeText(screen.getByLabelText('Comment'), 'On it');
    await fireEvent.press(screen.getByTestId('task-comment-send'));
    expect(await screen.findByText('Nico: On it')).toBeOnTheScreen();
  });
});

describe('task checklist', () => {
  it('a tick is written to the server, and the box follows its answer', async () => {
    serveTasks(SAMPLE_ROWS, {
      12: {
        checklist: {
          done: 0,
          total: 1,
          items: [{ id: 's-1', text: 'Measure the form', isDone: false, position: 1 }],
        },
      },
    });
    await openTasks('/tasks/12');
    const box = screen.getByRole('checkbox', { name: 'Measure the form' });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    await waitFor(() => expect(taskApi().task(12)?.checklist.items[0]?.isDone).toBe(true));
    expect(await screen.findByRole('checkbox', { name: 'Measure the form' })).toBeChecked();
  });
});

describe('task sheets say what is missing', () => {
  it('Reopen names the missing reason as its hint, and under it once touched', async () => {
    await openTasks('/tasks/3');
    await fireEvent.press(button('Reopen'));
    const send = await screen.findByTestId('reopen-send');
    expect(send.props.accessibilityHint).toBe('Enter a reason of at least 3 characters.');
    expect(screen.queryByText('Enter a reason of at least 3 characters.')).not.toBeOnTheScreen();
    await fireEvent(screen.getByTestId('reopen-reason'), 'blur');
    expect(screen.getByText('Enter a reason of at least 3 characters.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('reopen-reason'), 'Still broken');
    expect(send.props.accessibilityHint).toBeUndefined();
  });

  it('Cancel names Why cancel? as required, and asks for the note once Other is picked', async () => {
    await openTasks('/tasks/12/cancel');
    const send = screen.getByTestId('cancel-send');
    expect(screen.getByLabelText('Why cancel?, required')).toBeOnTheScreen();
    expect(send.props.accessibilityHint).toBe('Pick why to cancel the task.');
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    expect(send.props.accessibilityHint).toBe('Add a note to cancel for Other.');
    expect(screen.getByTestId('cancel-note')).toHaveAccessibleName(
      'Note (required for Other), required',
    );
    await fireEvent(screen.getByTestId('cancel-note'), 'blur');
    expect(screen.getByText('Add a note to cancel for Other.')).toBeOnTheScreen();
  });
});

describe('task sheets turn away', () => {
  it('Cancel of a task the server does not offer it for goes home', async () => {
    serveTasks([wireItem({ can: { update: true, comment: true } })]);
    await openTasks('/tasks/12/cancel');
    await settleTasks();
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(status(12)).toBe('todo');
  });

  it('Reopen of a task that is not finished goes home', async () => {
    await openTasks('/tasks/12/reopen');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});
