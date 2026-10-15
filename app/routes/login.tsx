import { Box, Paper, SimpleGrid } from '@mantine/core';
import { hasGoogleAuth, isProd } from '@server/env';
import { getSettings } from '@server/settings';
import { getBranding } from '@server/settings-branding';
import { effectiveDemoTtlHours, getDemo } from '@server/settings-demo';
import { LoginForm } from '~/components/login/LoginForm';
import { LoginShowcase } from '~/components/login/LoginShowcase';
import { loginAuthMode } from '~/lib/login-mode';
import type { Route } from './+types/login';

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Masuk — ${loaderData?.branding.appName ?? 'Simple PM'}` }];
}

export async function loader() {
  const [settings, branding, demo] = await Promise.all([getSettings(), getBranding(), getDemo()]);
  // The server decides the mode so a stale setting can never show email sign-in in production.
  const { emailAuthEnabled, signupEnabled } = loginAuthMode(isProd, settings);
  const demoTtlHours = demo.enabled ? effectiveDemoTtlHours(demo) : null;
  return { googleEnabled: hasGoogleAuth, emailAuthEnabled, signupEnabled, branding, demoTtlHours };
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { branding, ...auth } = loaderData;
  return (
    <Box
      mih="100dvh"
      p={{ base: 'sm', sm: 'xl' }}
      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Paper radius="lg" shadow="xl" maw={1080} w="100%" style={{ overflow: 'hidden' }}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0}>
          <Box p={{ base: 'lg', sm: 'xl' }} style={{ alignSelf: 'center' }}>
            <LoginForm appName={branding.appName} supportUrl={branding.supportUrl} {...auth} />
          </Box>
          <Box visibleFrom="md" p="sm" mih={640}>
            <LoginShowcase appName={branding.appName} tagline={branding.appTagline} />
          </Box>
        </SimpleGrid>
      </Paper>
    </Box>
  );
}
