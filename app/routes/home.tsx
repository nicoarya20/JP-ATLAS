import { auth } from '@server/auth';
import { hasGoogleAuth, isProd } from '@server/env';
import { redirectToHome } from '@server/guard';
import { getSettings } from '@server/settings';
import { getBranding } from '@server/settings-branding';
import { LoginScreen } from '~/components/login/LoginScreen';
import { loginAuthMode } from '~/lib/login-mode';
import type { Route } from './+types/home';

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.branding.appName ?? 'Simple PM';
  return [
    { title: `Masuk — ${name}` },
    {
      name: 'description',
      content: `Masuk ke ${name} untuk membuka konsolnya: proyek, tugas, jadwal, dan laporan tim Anda dalam satu tempat. Gunakan email atau akun Google.`,
    },
  ];
}

/**
 * The site root is the login screen. A signed-in visitor never sees it: the loader resolves their
 * role server-side and sends them to that role's home (held accounts fall back to /login).
 */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (session?.user) return await redirectToHome(request);
  const [settings, branding] = await Promise.all([getSettings(), getBranding()]);
  // The server decides the mode so a stale setting can never show email sign-in in production.
  const { emailAuthEnabled, signupEnabled } = loginAuthMode(isProd, settings);
  return { googleEnabled: hasGoogleAuth, emailAuthEnabled, signupEnabled, branding };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { branding, ...auth } = loaderData;
  return <LoginScreen branding={branding} {...auth} />;
}
