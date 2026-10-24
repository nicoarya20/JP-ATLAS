import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { PROJECTS, type Role } from '../../src/data/sample';
import { PersonScreen } from '../../src/screens/team/person.screen';
import { TeamScreen } from '../../src/screens/team/team.screen';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

beforeEach(() => jest.clearAllMocks());

const showTeam = (role: Role, projects?: typeof PROJECTS) =>
  render(<TeamScreen role={role} projects={projects} />, { wrapper: GluestackUIProvider });

describe('TeamScreen', () => {
  test('PM: me marked (You), counts for everyone, a row opens the person', async () => {
    await showTeam('pm');
    expect(
      screen.getByText('Projects you manage · 3 people · 6 active tasks · 1 overdue'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('team-row-nico')).toHaveAccessibleName(/^Nico Pratama \(You\), /);
    expect(screen.getByText('1 overdue')).toBeOnTheScreen();
    expect(screen.getByText('Leave planned Oct 12–14')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('team-row-rina'));
    expect(router.push).toHaveBeenCalledWith('/more/team/rina');
  });

  test('a row reads every line it shows: role, status, extra and the counts', async () => {
    await showTeam('pm');
    expect(screen.getByTestId('team-row-rina')).toHaveAccessibleName(
      'Rina Wulandari, Member · Atlas Project, Available, Also on other projects, 1 active',
    );
    // The red overdue count is read too, not only seen.
    expect(screen.getByLabelText(/, \d+ active, 1 overdue$/)).toBeOnTheScreen();
  });

  test('Admin: everyone and the Users note', async () => {
    await showTeam('admin');
    expect(screen.getByTestId('team-row-ayu')).toHaveAccessibleName(
      'Ayu Lestari (You), Admin · No project, Available',
    );
    expect(screen.getByTestId('team-row-sri')).toBeOnTheScreen();
    expect(
      screen.getByText('Approving new users and changing roles happens in More › Users.'),
    ).toBeOnTheScreen();
  });

  test('Member: only my own counts, and the note that says why', async () => {
    await showTeam('member');
    expect(screen.getAllByText(/ active$/)).toHaveLength(1);
    expect(
      screen.getByText(
        'Task counts per person are visible only to that person, the project Manager and Admin.',
      ),
    ).toBeOnTheScreen();
  });

  test('Member on no project: the empty state', async () => {
    const none = PROJECTS.map((p) => ({ ...p, members: p.members.filter((m) => m !== 'Dodi') }));
    await showTeam('member', none);
    expect(screen.getByTestId('team-empty')).toBeOnTheScreen();
    expect(screen.getByText('No team yet')).toBeOnTheScreen();
  });

  test('search narrows the list; no match offers a reset', async () => {
    await showTeam('pm');
    const search = screen.getByLabelText('Search name…');
    await fireEvent.changeText(search, 'rin');
    expect(screen.getByTestId('team-row-rina')).toBeOnTheScreen();
    expect(screen.queryByTestId('team-row-dodi')).not.toBeOnTheScreen();
    await fireEvent.changeText(search, 'zzz');
    expect(screen.getByText('No one matches this search.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reset filters'));
    expect(screen.getByTestId('team-row-dodi')).toBeOnTheScreen();
  });
});

describe('PersonScreen', () => {
  const showPerson = (id: string, role: Role) =>
    render(<PersonScreen id={id} role={role} />, { wrapper: GluestackUIProvider });

  test('PM: facts, shared projects, active tasks; rows open their items', async () => {
    await showPerson('rina', 'pm');
    expect(screen.getByText('Rina Wulandari')).toBeOnTheScreen();
    expect(screen.getByText('rina@kantor.id')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^#15 Review the onboarding page design, /)).toHaveAccessibleName(
      '#15 Review the onboarding page design, To do, Atlas Project · This week',
    );
    await fireEvent.press(screen.getByText('#15 Review the onboarding page design'));
    expect(router.push).toHaveBeenCalledWith('/tasks/15');
    await fireEvent.press(screen.getByText('Atlas Project'));
    expect(router.push).toHaveBeenCalledWith('/projects/atlas');
  });

  test('Member: someone else’s tasks stay hidden, with the reason', async () => {
    await showPerson('rina', 'member');
    expect(screen.queryByText('#15 Review the onboarding page design')).not.toBeOnTheScreen();
    expect(
      screen.getByText(
        "Other people's task lists are visible only to the project Manager and Admin.",
      ),
    ).toBeOnTheScreen();
  });

  test('an unknown key: not found, not someone else', async () => {
    await showPerson('nobody', 'pm');
    expect(screen.getByText('Person not found')).toBeOnTheScreen();
    expect(screen.queryByText('Rina Wulandari')).not.toBeOnTheScreen();
  });
});
