import { Box, Center, Image, Stack, Text } from '@mantine/core';

/** Decorative corner grid: faint enough to read as texture behind the logo. */
const GRID_OPACITY = 0.18;

/** Faded square grid for a panel corner; purely decorative. */
function CornerGrid({ corner }: { corner: 'top-right' | 'bottom-left' }) {
  const top = corner === 'top-right';
  return (
    <Box
      aria-hidden
      pos="absolute"
      w={260}
      h={260}
      top={top ? -24 : undefined}
      right={top ? -24 : undefined}
      bottom={top ? undefined : -24}
      left={top ? undefined : -24}
      opacity={GRID_OPACITY}
      // `bg` maps to the `background` shorthand, which would reset the `background-size` that
      // draws the grid; `pointerEvents` and `maskImage` have no Mantine prop at all.
      style={{
        pointerEvents: 'none',
        backgroundImage:
          'linear-gradient(var(--mantine-color-white) 1px, transparent 1px), linear-gradient(90deg, var(--mantine-color-white) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: `radial-gradient(circle at ${top ? 'top right' : 'bottom left'}, black, transparent 70%)`,
      }}
    />
  );
}

/** Secondary copy on the brand panel; white at full strength is reserved for the logo. */
const MUTED_ON_BRAND = 0.72;

/**
 * Right-hand brand panel of the login screen: a full-height violet gradient with the white
 * Simple PM logo centred. The logo asset is white, so it only reads on this violet panel.
 */
export function LoginShowcase({ appName, tagline }: { appName: string; tagline: string | null }) {
  return (
    // Mantine has no `overflow` style prop, so this stays a `style`: it clips the corner grids to
    // the panel edge. A violet gradient (brighter top-left) gives the panel depth; both stops are
    // atlas palette tokens, so the frozen theme still owns the colour.
    <Box
      pos="relative"
      h="100%"
      mih="100%"
      bg="linear-gradient(145deg, var(--mantine-color-atlas-6), var(--mantine-color-atlas-8))"
      style={{ overflow: 'hidden' }}
    >
      <CornerGrid corner="top-right" />
      <CornerGrid corner="bottom-left" />
      <Center h="100%" p="xl" pos="relative">
        <Stack align="center" gap="lg" maw={360} w="100%">
          <Image src="/logo-simple-pm.png" alt={appName} w={220} maw="60%" fit="contain" />
          {tagline && (
            <Text c="white" opacity={MUTED_ON_BRAND} ta="center" size="sm">
              {tagline}
            </Text>
          )}
        </Stack>
      </Center>
    </Box>
  );
}
