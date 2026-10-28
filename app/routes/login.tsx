import { hasGoogleAuth, isProd } from '@server/env';
import { getSettings } from '@server/settings';
import { getBranding } from '@server/settings-branding';
import { LoginScreen } from '~/components/login/LoginScreen';
import { loginAuthMode } from '~/lib/login-mode';
import type { Route } from './+types/login';

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

export async function loader() {
  const [settings, branding] = await Promise.all([getSettings(), getBranding()]);
  // The server decides the mode so a stale setting can never show email sign-in in production.
  const { emailAuthEnabled, signupEnabled } = loginAuthMode(isProd, settings);
  return { googleEnabled: hasGoogleAuth, emailAuthEnabled, signupEnabled, branding };
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { branding, ...auth } = loaderData;
  return <LoginScreen branding={branding} {...auth} />;
}
