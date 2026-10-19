import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('login', 'routes/login.tsx'),
  // Post-auth resolver: sends a logged-in user to their role's home.
  route('go', 'routes/go.tsx'),
  // Signed-in but banned users land here (see server/guard.ts).
  route('banned', 'routes/banned.tsx'),
  // Signed-in accounts awaiting approval or rejected land here (see server/guard.ts).
  route('waiting', 'routes/waiting.tsx'),
  // Strict per-role areas. Each layout guards its role; children inherit it.
  // Product area (any signed-in role). New product pages go here, not under /dev or /dashboard.
  layout('routes/app/layout.tsx', [
    route('app', 'routes/app/home.tsx'),
    route('app/inbox', 'routes/app/inbox.tsx'),
    route('app/projects', 'routes/app/projects.tsx'),
    // Static `new` is listed before `:projectId` so it is never read as an id.
    route('app/projects/new', 'routes/app/project-new.tsx'),
    // Each tab guards itself: a layout guard does not protect its children's parallel loaders.
    route('app/projects/:projectId', 'routes/app/project/layout.tsx', [
      index('routes/app/project/summary.tsx'),
      route('tasks', 'routes/app/project/tasks.tsx'),
      route('phases', 'routes/app/project/phases.tsx'),
      route('members', 'routes/app/project/members.tsx'),
      route('settings', 'routes/app/project/settings.tsx'),
    ]),
    route('app/tasks', 'routes/app/tasks.tsx'),
    route('app/tasks/new', 'routes/app/task-new.tsx'),
    route('app/tasks/:number', 'routes/app/task-detail.tsx'),
    route('app/tasks/:number/edit', 'routes/app/task-edit.tsx'),
    route('app/events', 'routes/app/events.tsx'),
    route('app/team', 'routes/app/team.tsx'),
    route('app/trash', 'routes/app/trash.tsx'),
    route('app/settings', 'routes/app/settings.tsx'),
    route('profile', 'routes/app/profile.tsx'),
  ]),
  layout('routes/admin/layout.tsx', [
    route('dashboard', 'routes/admin/dashboard.tsx'),
    route('dashboard/users', 'routes/admin/users.tsx'),
  ]),
  layout('routes/super/layout.tsx', [
    route('dev', 'routes/super/overview.tsx'),
    route('dev/users', 'routes/super/users.tsx'),
    route('dev/sessions', 'routes/super/sessions.tsx'),
    route('dev/posts', 'routes/super/posts.tsx'),
    route('dev/api-keys', 'routes/super/api-keys.tsx'),
    route('dev/db-schema', 'routes/super/db-schema.tsx'),
    route('dev/visits', 'routes/super/visits.tsx'),
    route('dev/login-logs', 'routes/super/login-logs.tsx'),
    route('dev/rate-limit-logs', 'routes/super/rate-limit-logs.tsx'),
    route('dev/settings', 'routes/super/settings.tsx'),
    route('dev/tools', 'routes/super/tools.tsx'),
    route('dev/file-health', 'routes/super/file-health.tsx'),
    route('dev/server-logs', 'routes/super/server-logs.tsx'),
    route('dev/audit', 'routes/super/audit.tsx'),
    route('dev/changelog', 'routes/super/changelog.tsx'),
  ]),
] satisfies RouteConfig;
