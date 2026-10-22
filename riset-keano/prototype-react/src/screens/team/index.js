// Team module registration (owner: orchestrator).
import { screen } from '../../core/registry';
import './team.css';
import { TeamEmpty, TeamList } from './team.list';
import TeamPerson from './team.person';

const G = 'Team';
screen('team.list', { title: '① Team · List', group: G, Component: TeamList });
screen('team.person', { title: '② Team · Person', group: G, Component: TeamPerson });
screen('team.empty', { title: '③ Team · Empty', group: G, roles: ['member'], Component: TeamEmpty });
