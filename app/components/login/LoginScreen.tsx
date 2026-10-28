import { Box, Center, SimpleGrid } from '@mantine/core';
import { LoginForm } from '~/components/login/LoginForm';
import { LoginShowcase } from '~/components/login/LoginShowcase';

type Props = {
  branding: { appName: string; appTagline: string | null; supportUrl: string | null };
  googleEnabled: boolean;
  emailAuthEnabled: boolean;
  signupEnabled: boolean;
};

/**
 * The full-screen two-column sign-in layout, shared by `/` and `/login` so both render identical
 * UI. Left column is the surface with the sign-in form; right column is the violet brand panel with
 * the logo, hidden below `md` (the form takes the full width on phones).
 */
export function LoginScreen({ branding, googleEnabled, emailAuthEnabled, signupEnabled }: Props) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} mih="100dvh">
      <Center bg="var(--mantine-color-body)" p={{ base: 'lg', sm: 'xl' }}>
        <Box w="100%" maw={420}>
          <LoginForm
            appName={branding.appName}
            supportUrl={branding.supportUrl}
            googleEnabled={googleEnabled}
            emailAuthEnabled={emailAuthEnabled}
            signupEnabled={signupEnabled}
          />
        </Box>
      </Center>
      <Box visibleFrom="md">
        <LoginShowcase appName={branding.appName} tagline={branding.appTagline} />
      </Box>
    </SimpleGrid>
  );
}
