// Settings module registration (owner: orchestrator).
import { getRole } from '../../core/session';
import { screen, sheet } from '../../core/registry';
import './settings.css';
import SettingsMain from './settings.main';
import SettingsProfile from './settings.profile';
import SettingsLeave, { LEAVE } from './settings.leave';

const G = 'Settings';
screen('settings.main', { title: '① Settings', group: G, Component: SettingsMain });
screen('settings.profile', { title: '② Edit profile', group: G, Component: SettingsProfile });
sheet('settings.leave', { from: 'settings.main', title: () => `③ Sheet · ${LEAVE[getRole()].title}`, group: G, Component: SettingsLeave });
