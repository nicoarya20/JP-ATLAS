/** Own-profile routes (`/api/app/profile`): read, and edit contact details and the text size preference. */
import { Elysia, t } from 'elysia';
import { TEXT_SIZES } from '../pm/enums';
import { fail } from '../pm/respond';
import {
  getProfile,
  PROFILE_DEPARTMENT_MAX,
  PROFILE_NAME_MAX,
  PROFILE_PHONE_MAX,
  PROFILE_TITLE_MAX,
  updateProfile,
} from '../profile/profile.service';
import { textSizeCookie } from '../text-size';
import { appContext } from './app-context';

const text = (maxLength: number) => t.Optional(t.Nullable(t.String({ maxLength })));

// Unknown keys (`role`, `approvalStatus`, ...) are not rejected: the service only reads these five.
const ProfileBody = t.Object({
  displayName: text(PROFILE_NAME_MAX),
  phone: text(PROFILE_PHONE_MAX),
  jobTitle: text(PROFILE_TITLE_MAX),
  department: text(PROFILE_DEPARTMENT_MAX),
  // Not t.UnionEnum: it defaults to the first value, which would reset the size on every PATCH.
  textSize: t.Optional(t.Union(TEXT_SIZES.map((size) => t.Literal(size)))),
});

export const profileApi = new Elysia({ prefix: '/profile' })
  .use(appContext)
  .get('/', async ({ actor, status }) => {
    const view = await getProfile(actor.user.id);
    return view ?? fail(status, 'NOT_FOUND');
  })
  .patch(
    '/',
    async ({ actor, body, set, status }) => {
      const view = await updateProfile(actor.user.id, body);
      if (!view) return fail(status, 'NOT_FOUND');
      // The cookie lets the next page load scale text without a DB lookup (X1 D2).
      if (body.textSize) set.headers['set-cookie'] = textSizeCookie(body.textSize);
      return view;
    },
    { body: ProfileBody },
  );
