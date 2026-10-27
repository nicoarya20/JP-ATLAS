import { Box, Center, Paper, SimpleGrid } from '@mantine/core';
import { hasGoogleAuth, isProd } from '@server/env';
import { getSettings } from '@server/settings';
import { getBranding } from '@server/settings-branding';
import { LoginForm } from '~/components/login/LoginForm';
import { LoginShowcase } from '~/components/login/LoginShowcase';
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

/** Two-column sign-in card: wide enough for the showcase, tall enough for its preview cards. */
const CARD_MAX_WIDTH = 1080;
const SHOWCASE_MIN_HEIGHT = 640;

export default function Login({ loaderData }: Route.ComponentProps) {
  const { branding, ...auth } = loaderData;
  return (
    <Center
      mih="100dvh"
      p={{ base: 'sm', sm: 'xl' }}
      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))"
    >
      {/* Mantine has no `overflow` style prop, so this stays a `style`: it clips the showcase
          panel to the card's rounded corners. */}
      <Paper
        withBorder={false}
        radius="lg"
        shadow="xl"
        maw={CARD_MAX_WIDTH}
        w="100%"
        style={{ overflow: 'hidden' }}
      >
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0}>
          {/* Mantine has no `alignSelf` style prop: the form centres against the taller
              showcase column instead of stretching to its height. */}
          <Box p={{ base: 'lg', sm: 'xl' }} style={{ alignSelf: 'center' }}>
            <LoginForm appName={branding.appName} supportUrl={branding.supportUrl} {...auth} />
          </Box>
          <Box visibleFrom="md" p="sm" mih={SHOWCASE_MIN_HEIGHT}>
            <LoginShowcase appName={branding.appName} tagline={branding.appTagline} />
          </Box>
        </SimpleGrid>
      </Paper>
    </Center>
  );
}
