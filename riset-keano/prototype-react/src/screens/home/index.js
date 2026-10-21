// Home module registration (owner: orchestrator). More is a tab-bar panel, not a screen.
import { panel, screen, sheet } from '../../core/registry';
import { ROLES, getRole } from '../../core/session';
import './home.css';
import HomeCreate from './home.create';
import HomeMain from './home.main';
import MoreMenu from './home.more';
import HomeSearch from './home.search';

screen('home.main', { title: () => `① Home · ${ROLES[getRole()]}`, group: 'Home', Component: HomeMain });
screen('home.search', { title: '② Search / ask', group: 'Home', Component: HomeSearch });
// Same overlay as profile.me (kit FullSheet), sized to its five rows
sheet('home.create', { title: '③ Sheet · Create', group: 'Home', full: true, fit: true, Component: HomeCreate });
panel('more', { Component: MoreMenu });
