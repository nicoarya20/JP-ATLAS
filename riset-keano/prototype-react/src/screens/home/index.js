// Home module registration (owner: orchestrator).
import { screen, sheet } from '../../core/registry';
import { ROLES, getRole } from '../../core/session';
import './home.css';
import HomeCreate from './home.create';
import HomeMain from './home.main';
import HomeMore from './home.more';
import HomeSearch from './home.search';

screen('home.main', { title: () => `① Home · ${ROLES[getRole()]}`, group: 'Home', Component: HomeMain });
screen('home.more', { title: '② More', group: 'Home', Component: HomeMore });
screen('home.search', { title: '③ Search / ask', group: 'Home', Component: HomeSearch });
sheet('home.create', { title: '④ Sheet · Create', group: 'Home', snap: 0.7, Component: HomeCreate });
