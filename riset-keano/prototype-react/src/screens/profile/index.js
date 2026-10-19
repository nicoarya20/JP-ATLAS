// Profile module registration (owner: orchestrator). The profile is a full-height overlay, opened from the More panel.
import { sheet } from '../../core/registry';
import './profile.css';
import ProfileMain from './profile.main';

sheet('profile.me', { title: '① Overlay · Profile', group: 'Profile', full: true, Component: ProfileMain });
