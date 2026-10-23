// The 71 screen/sheet ids of the prototype (the vanilla wireframe-mobile ids plus home.create, the profile.me overlay
// and its profile.calendar screen, the tasks/events/projects.filter sheets, the tasks.edit and projects.edit screens and
// the projects.archive sheet; More became the tab bar's More panel, so home.more is gone). test-only
export const EXPECTED_IDS = [
  'auth.login', 'auth.account', 'auth.pending', 'auth.denied',
  'home.main', 'home.search', 'home.create',
  'projects.list', 'projects.filter', 'projects.new', 'projects.form', 'projects.story', 'projects.draft', 'projects.template',
  'projects.overview', 'projects.tasks', 'projects.phases', 'projects.members', 'projects.extend', 'projects.edit', 'projects.archive',
  'tasks.my', 'tasks.filter', 'tasks.all', 'tasks.board', 'tasks.empty', 'tasks.write', 'tasks.form', 'tasks.csv',
  'tasks.detail-todo', 'tasks.detail-progress', 'tasks.detail-review', 'tasks.edit', 'tasks.return', 'tasks.cancel', 'tasks.settings',
  'events.list', 'events.filter', 'events.calendar', 'events.new', 'events.new-details', 'events.empty',
  'events.detail-upcoming', 'events.detail-recurring', 'events.record-ready', 'events.recording',
  'events.step1', 'events.step2', 'events.step3', 'events.detail-confirmed',
  'events.cancel', 'events.archive', 'events.cancel-recurring', 'events.archive-recurring',
  'inbox.respond', 'inbox.updates', 'inbox.empty',
  'team.list', 'team.person', 'team.empty',
  'archive.list', 'archive.empty', 'archive.undo', 'archive.delete',
  'users.approve', 'users.roles',
  'settings.main', 'settings.profile', 'settings.leave',
  'profile.me', 'profile.calendar',
];
