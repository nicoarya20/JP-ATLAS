// Auth module registration (owner: orchestrator).
import { screen } from '../../core/registry';
import './auth.css';
import { AuthAccount, AuthDenied, AuthLogin } from './auth.login';
import AuthPending from './auth.pending';

const G = 'Login & Registration';
screen('auth.login', { title: '① Login', group: G, Component: AuthLogin });
screen('auth.account', { title: '② Choose Google account', group: G, Component: AuthAccount });
screen('auth.pending', { title: '③ Profile · Awaiting approval', group: G, Component: AuthPending });
screen('auth.denied', { title: '⑤ Login · Access denied', group: G, Component: AuthDenied });
