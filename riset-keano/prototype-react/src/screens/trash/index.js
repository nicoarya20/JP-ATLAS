// Trash module registration (owner: orchestrator).
import { screen, sheet } from '../../core/registry';
import './trash.css';
import { TrashEmpty, TrashList } from './trash.list';
import TrashDelete from './trash.delete';
import TrashUndo from './trash.undo';

const G = 'Trash';
screen('trash.list', { title: '① Trash · List', group: G, Component: TrashList });
screen('trash.empty', { title: '② Trash · Empty', group: G, Component: TrashEmpty });
screen('trash.undo', { title: '③ Undo after delete', group: G, Component: TrashUndo });
sheet('trash.delete', { title: '④ Sheet · Delete forever', group: G, roles: ['admin'], Component: TrashDelete });
