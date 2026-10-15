// Home module registration (owner: orchestrator).
import { screen } from '../../core/registry';
import { ROLES, getRole } from '../../core/session';
import './home.css';
import HomeMain from './home.main';
import HomeMore from './home.more';
import HomeSearch from './home.search';

screen('home.main', { title: () => `① Home · ${ROLES[getRole()]}`, group: 'Home', Component: HomeMain });
screen('home.more', { title: '② More', group: 'Home', Component: HomeMore });
screen('home.search', { title: '③ Search / ask', group: 'Home', Component: HomeSearch });
