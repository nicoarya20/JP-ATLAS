// Tasks module (Penpot "Project Manager · Tugas" ①–⑬): lists, board, create, CSV import, detail per status, sheets, settings.
import { screen, sheet } from '../../core/registry';
import { TasksAll, TasksEmpty, TasksMy } from './tasks.list';
import { TasksBoard } from './tasks.board';
import { TasksCsv, TasksForm, TasksWrite } from './tasks.new';
import { TasksDetailProgress, TasksDetailReview, TasksDetailTodo } from './tasks.detail.screens';
import { TasksCancel, TasksReturn } from './tasks.sheets';
import { TasksFilter } from './tasks.filter';
import { TasksSettings } from './tasks.settings';
import './tasks.css';

const G = 'Tasks';

screen('tasks.my', { title: '① My tasks (List)', group: G, Component: TasksMy });
sheet('tasks.filter', { title: '①b Overlay · Filter & sort', group: G, full: true, Component: TasksFilter });
screen('tasks.all', { title: '② All tasks (List)', group: G, Component: TasksAll });
screen('tasks.board', { title: '③ Kanban', group: G, Component: TasksBoard });
screen('tasks.empty', { title: '④ My tasks empty', group: G, Component: TasksEmpty });
screen('tasks.write', { title: '⑤ New task · Just write ✦', group: G, Component: TasksWrite });
screen('tasks.form', { title: '⑥ New task · Fill form', group: G, Component: TasksForm });
screen('tasks.csv', { title: '⑦ Import CSV', group: G, Component: TasksCsv });
screen('tasks.detail-todo', { title: '⑧ Detail · To do', group: G, Component: TasksDetailTodo });
screen('tasks.detail-progress', { title: '⑨ Detail · In progress', group: G, Component: TasksDetailProgress });
screen('tasks.detail-review', { title: '⑩ Detail · In review', group: G, Component: TasksDetailReview });
sheet('tasks.return', { title: '⑪ Sheet · Return', group: G, roles: ['pm', 'admin'], Component: TasksReturn });
sheet('tasks.cancel', { title: '⑫ Sheet · Cancel', group: G, Component: TasksCancel });
screen('tasks.settings', { title: '⑬ Project settings', group: G, Component: TasksSettings });
