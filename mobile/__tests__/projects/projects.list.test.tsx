// Projects ① list and ①b Filter & sort (port of prototype projects.list.test / projects.filter.test): the cards the
// server sent, and the request each control makes.
//
// What changed in Phase 2: status, the attention flag, the sort order and the search text are **sent** rather than
// applied here, so these tests assert both halves — the parameter that went out, and the rows that came back. The
// stub narrows its rows the way the server does, so a screen that quietly filtered the page itself would disagree
// with it and fail.
//
// Two blocks of the Phase 1 suite are gone with the features they covered, both listed in
// docs/phase2-gap-disembunyikan.md:
//
// - **The people row** ("My projects", a teammate pick, `?who=`). The list route takes `scope=mine|all` and no
//   person, so the row could only ever have filtered the page already loaded (GAP A-2).
// - **The client-side Member filter.** `projectsFor(role)` is gone: which projects a Member may see is clamped
//   server-side, so what the list must now guarantee is that it shows what it was sent and adds nothing.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { MEMBER_PROJECTS } from '../helpers/projects-api-server';
import { answerProjects, asked, openProjects, projectCalls, resetProjectStores } from '../helpers/projects-router';

resetProjectStores();

const cardIds = () =>
  screen.queryAllByTestId(/^project-card-/).map((c) => String(c.props.testID).slice(13));
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const search = () => screen.getByPlaceholderText('Search project name…');
/** The query string of the last list request, which is what the controls are really asserted on. */
const lastList = () => [...projectCalls()].reverse().find((u) => u.includes('/api/app/projects?'));

describe('Projects list', () => {
  it('shows every project the server sent, nearest deadline first', async () => {
    await openProjects('/projects');
    expect(screen.getByTestId('screen-projects')).toBeOnTheScreen();
    expect(cardIds()).toEqual(['website', 'migration', 'sinar', 'atlas', 'attendance', 'tools']);
  });

  it('asks for its own projects and shows exactly what came back, adding no filter of its own', async () => {
    answerProjects({ rows: MEMBER_PROJECTS });
    await openProjects('/projects', 'member');
    await waitFor(() => expect(cardIds()).toEqual(['migration', 'atlas', 'tools']));
    // scope=mine is the list's request for every role; a Member is clamped to it server-side anyway.
    expect(lastList()).toContain('scope=mine');
  });

  it('counts from the server total, not from the rows on screen', async () => {
    await openProjects('/projects');
    expect(screen.getByText('6 projects')).toBeOnTheScreen();
  });

  it('opens a project from its card', async () => {
    await openProjects('/projects');
    await fireEvent.press(screen.getByTestId('project-card-atlas'));
    await waitFor(() => expect(screen).toHavePathname('/projects/atlas'));
  });

  it('sends the search text and shows the rows it narrowed to; no match offers Reset filters', async () => {
    await openProjects('/projects');
    await fireEvent.changeText(search(), 'atl');
    await waitFor(() => expect(cardIds()).toEqual(['atlas']));
    expect(lastList()).toContain('q=atl');
    await fireEvent.changeText(search(), 'zzz');
    await waitFor(() => expect(screen.getByText('No projects match these filters.')).toBeOnTheScreen());
    await press('Reset filters');
    await waitFor(() => expect(cardIds()).toHaveLength(6));
  });

  it('says nothing about being empty while the first page is still out', async () => {
    await openProjects('/projects');
    // The rows arrived in this test; the point is that neither empty state is ever shown with them.
    expect(screen.queryByText("You're not in any project yet.")).not.toBeOnTheScreen();
    expect(screen.queryByText('No projects match these filters.')).not.toBeOnTheScreen();
  });
});

describe('Filter & sort', () => {
  it('Apply sends the status and the sort, and the filter icon shows its dot', async () => {
    await openProjects('/projects');
    await fireEvent.press(screen.getByTestId('projects-filter'));
    await waitFor(() => expect(screen).toHavePathname('/projects/filter'));
    const sheet = within(screen.getByTestId('filter-sheet'));
    await fireEvent.press(sheet.getByRole('button', { name: 'Active' }));
    await fireEvent.press(sheet.getByLabelText('Name (A–Z)'));
    await press('Apply');
    await waitFor(() => expect(screen).toHavePathname('/projects'));
    await waitFor(() => expect(cardIds()).toEqual(['atlas', 'migration', 'sinar']));
    // "Done" is `completed` on the wire; the sheet's word and the parameter are not the same string.
    expect(lastList()).toContain('status=active');
    expect(lastList()).toContain('sort=name');
    expect(screen.getByTestId('projects-filter-dot')).toBeOnTheScreen();
  });

  it('the attention flag sends perhatian=1, which merges at risk and late (A-3)', async () => {
    await openProjects('/projects/filter');
    const sheet = within(screen.getByTestId('filter-sheet'));
    await fireEvent.press(sheet.getByRole('button', { name: 'Needs attention' }));
    await press('Apply');
    await waitFor(() => expect(cardIds()).toEqual(['sinar', 'atlas']));
    expect(asked('perhatian=1')).toBe(true);
    await fireEvent.press(screen.getByTestId('projects-filter'));
    await press('Reset');
    await press('Apply');
    await waitFor(() => expect(cardIds()).toHaveLength(6));
  });

  it('the sort order alone leaves the dot off: it reorders without narrowing', async () => {
    await openProjects('/projects/filter');
    const sheet = within(screen.getByTestId('filter-sheet'));
    await fireEvent.press(sheet.getByLabelText('Name (A–Z)'));
    await press('Apply');
    await waitFor(() => expect(screen).toHavePathname('/projects'));
    expect(screen.queryByTestId('projects-filter-dot')).not.toBeOnTheScreen();
  });
});
