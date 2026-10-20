import { requireUser } from '@server/guard';
import { getProfile } from '@server/profile/profile.service';
import { data, useRevalidator } from 'react-router';
import { ProfileEditForm } from '~/components/account/ProfileEditForm';
import { PageContainer } from '~/components/ui/PageContainer';
import { useApp } from '~/lib/app-context';
import { useSession } from '~/lib/auth-client';
import type { MyProfile } from '~/lib/profile-api';
import type { Route } from './+types/settings-profile';

export function meta() {
  return [{ title: 'Ubah Profil — Simple PM' }];
}

/** Own profile for the edit screen; every signed-in role may open it (it only touches the caller's row). */
export async function loader({ request }: Route.LoaderArgs) {
  const auth = await requireUser(request);
  const profile = await getProfile(auth.user.id);
  if (!profile) throw data('Profil tidak ditemukan', { status: 404 });
  return { profile: profile satisfies MyProfile };
}

export default function SettingsProfile({ loaderData }: Route.ComponentProps) {
  const { user: ctxUser } = useApp();
  const { data: session, refetch } = useSession();
  const revalidator = useRevalidator();
  const image = (session?.user ?? ctxUser).image ?? null;
  const refresh = () => {
    refetch();
    revalidator.revalidate();
  };
  return (
    <PageContainer size="narrow">
      {/* key: a save or photo change re-seeds the fields from the fresh server values. */}
      <ProfileEditForm
        key={JSON.stringify(loaderData.profile)}
        profile={loaderData.profile}
        image={image}
        onPhotoChanged={refresh}
      />
    </PageContainer>
  );
}
