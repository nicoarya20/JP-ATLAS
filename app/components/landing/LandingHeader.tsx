import { Anchor, Box, Button, Container, Group, Text } from '@mantine/core';
import { FiGithub, FiLogIn, FiZap } from 'react-icons/fi';
import { Link } from 'react-router';
import { GITHUB_URL } from './landing.content';

/** The sticky bar sits above page content but below Mantine's modals and overlays (200+). */
const HEADER_Z_INDEX = 10;
const HEADER_BLUR = '10px';

const LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#konsol', label: 'Konsol' },
  { href: '#keamanan', label: 'Keamanan' },
  { href: '#arsitektur', label: 'Arsitektur' },
  { href: '#mulai', label: 'Mulai' },
  { href: '#faq', label: 'FAQ' },
];

/** Sticky top bar: brand, section anchors, GitHub, and a session-aware CTA. */
export function LandingHeader({
  appName,
  signedIn,
  homePath,
}: {
  appName: string;
  signedIn: boolean;
  homePath: string;
}) {
  return (
    <Box
      component="header"
      pos="sticky"
      top={0}
      bg="color-mix(in srgb, var(--mantine-color-body) 80%, transparent)"
      // Mantine has no prop for `zIndex`, `backdropFilter`, or a single-side border (`bd` sets
      // all four), so the sticky bar's stacking, blur, and bottom rule stay a `style`.
      style={{
        zIndex: HEADER_Z_INDEX,
        backdropFilter: `blur(${HEADER_BLUR})`,
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Container size="lg" py="sm">
        <Group justify="space-between" wrap="nowrap">
          <Anchor component={Link} to="/" underline="never" c="inherit">
            <Group gap="xs" wrap="nowrap">
              <FiZap size="1.25em" aria-hidden />
              <Text fw={800} size="lg">
                {appName}
              </Text>
            </Group>
          </Anchor>
          <Group gap="lg" visibleFrom="md">
            {LINKS.map((l) => (
              <Anchor key={l.href} href={l.href} size="sm" c="dimmed" underline="never">
                {l.label}
              </Anchor>
            ))}
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Button
              component="a"
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<FiGithub size="1.25em" aria-hidden />}
              visibleFrom="sm"
            >
              GitHub
            </Button>
            <Button
              component={Link}
              to={signedIn ? homePath : '/login'}
              size="sm"
              leftSection={<FiLogIn size="1.25em" aria-hidden />}
              prefetch="intent"
            >
              {signedIn ? 'Buka konsol' : 'Masuk'}
            </Button>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
