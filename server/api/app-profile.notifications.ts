/** Own notification switches (`/api/app/profile/notifications`): read, and flip "Pengingat acara" / "Kabar terbaru". */
import { Elysia, t } from 'elysia';
import { getNotificationPrefs, setNotificationPrefs } from '../profile/notification-prefs.service';
import { appContext } from './app-context';

// Only the two switches exist: other keys (a card kind that must always arrive) are never read, so they cannot be muted.
const PrefsBody = t.Object({
  eventReminder: t.Optional(t.Boolean()),
  inboxNews: t.Optional(t.Boolean()),
});

export const notificationPrefsApi = new Elysia({ prefix: '/notifications' })
  .use(appContext)
  .get('/', ({ actor }) => getNotificationPrefs(actor.user.id))
  .put('/', ({ actor, body }) => setNotificationPrefs(actor.user.id, body), { body: PrefsBody });
