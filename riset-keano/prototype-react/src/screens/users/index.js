// Users module registration (owner: orchestrator). Admin only.
import { screen } from '../../core/registry';
import './users.css';
import UsersApprove from './users.approve';
import UsersRoles from './users.roles';

const G = 'Users';
const ADMIN = ['admin'];
screen('users.approve', { title: '① Users · Approval', group: G, roles: ADMIN, Component: UsersApprove });
screen('users.roles', { title: '② Users · Roles', group: G, roles: ADMIN, Component: UsersRoles });
