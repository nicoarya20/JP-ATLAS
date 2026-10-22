// Profile module registration (owner: orchestrator). The profile is a full-height overlay, opened from the More panel;
// its My calendar row opens the week-view calendar screen.
import { screen, sheet } from '../../core/registry';
import './profile.css';
import './profile.calendar.css';
import ProfileCalendar from './profile.calendar';
import ProfileMain from './profile.main';

sheet('profile.me', { from: 'home.main', title: '① Overlay · Profile', group: 'Profile', full: true, Component: ProfileMain });
screen('profile.calendar', { title: '② My calendar', group: 'Profile', Component: ProfileCalendar });
