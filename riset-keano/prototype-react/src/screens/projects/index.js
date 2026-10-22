// Projects module registration (owner: pm-dashboard-65): list, create flows (form/story/AI draft/template), detail tabs, extend sheet.
import { screen, sheet } from '../../core/registry';
import { getRole } from '../../core/session';
import './projects.css';
import ProjectsList from './projects.list';
import { ProjectsFilter } from './projects.filter';
import { ProjectsForm, ProjectsNew, ProjectsStory } from './projects.create';
import { ProjectsDraft, ProjectsTemplate } from './projects.draft';
import { ProjectsOverview } from './projects.detail';
import { ProjectsMembers, ProjectsPhases, ProjectsTasks } from './projects.tabs';
import ProjectsExtend from './projects.extend';

const G = 'Projects';
const MANAGERS = ['pm', 'admin'];

screen('projects.list', { title: () => (getRole() === 'admin' ? '① All projects (Admin)' : '① All projects'), group: G, Component: ProjectsList });
sheet('projects.filter', { from: 'projects.list', title: '①b Overlay · Filter & sort', group: G, full: true, Component: ProjectsFilter });
screen('projects.new', { title: '③ New project · choose method', group: G, roles: MANAGERS, modal: true, Component: ProjectsNew });
screen('projects.form', { title: '④ Project form', group: G, roles: MANAGERS, Component: ProjectsForm });
screen('projects.story', { title: '⑤ Tell us about the project', group: G, roles: MANAGERS, Component: ProjectsStory });
screen('projects.draft', { title: '⑥ Review AI draft', group: G, roles: MANAGERS, Component: ProjectsDraft });
screen('projects.template', { title: '⑦ Use template', group: G, roles: MANAGERS, Component: ProjectsTemplate });
screen('projects.overview', { title: '⑧ Detail · Overview', group: G, Component: ProjectsOverview });
screen('projects.tasks', { title: '⑨ Detail · Tasks', group: G, Component: ProjectsTasks });
screen('projects.phases', { title: '⑩ Detail · Phases', group: G, Component: ProjectsPhases });
screen('projects.members', { title: '⑪ Detail · Members', group: G, Component: ProjectsMembers });
sheet('projects.extend', { from: 'projects.overview', title: '⑫ Extend deadline', group: G, roles: MANAGERS, Component: ProjectsExtend });
