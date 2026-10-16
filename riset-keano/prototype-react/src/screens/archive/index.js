// Archive module registration (owner: orchestrator).
import { screen, sheet } from '../../core/registry';
import './archive.css';
import { ArchiveEmpty, ArchiveList } from './archive.list';
import ArchiveDelete from './archive.delete';
import ArchiveUndo from './archive.undo';

const G = 'Archive';
screen('archive.list', { title: '① Archive · List', group: G, Component: ArchiveList });
screen('archive.empty', { title: '② Archive · Empty', group: G, Component: ArchiveEmpty });
screen('archive.undo', { title: '③ Undo after archive', group: G, Component: ArchiveUndo });
sheet('archive.delete', { title: '④ Sheet · Delete forever', group: G, roles: ['admin'], Component: ArchiveDelete });
