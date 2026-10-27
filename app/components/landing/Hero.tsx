import {
  Badge,
  Box,
  Button,
  Code,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { FiArrowRight, FiCheck, FiGithub } from 'react-icons/fi';
import { Link } from 'react-router';
import { GITHUB_URL } from './landing.content';
import { CODE_FONT_SIZE } from './landing.layout';

export type LandingStats = {
  tables: number;
  consolePages: number;
  mcpTools: number;
  testFiles: number;
  version: string;
};

const TRUST = ['MIT', 'SSR', 'Type-safe', 'Satu binary', 'Mobile-first', 'Ramah AI agent'];

/**
 * The terminal mock quotes macOS window-control colours, so these are not design tokens and must
 * not be aliased onto the palette: they would stop reading as a terminal.
 */
const WINDOW_CONTROLS = ['#ff5f57', '#febc2e', '#28c840'] as const;
const WINDOW_CONTROL_SIZE = 10;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Stack gap={0} align="center">
      <Text fz={28} fw={800} lh={1.1}>
        {value}
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        {label}
      </Text>
    </Stack>
  );
}

/** Headline, value proposition, CTAs, trust strip, live numbers, and a terminal mock. */
export function Hero({
  appName,
  tagline,
  stats,
  signedIn,
  homePath,
}: {
  appName: string;
  tagline: string;
  stats: LandingStats;
  signedIn: boolean;
  homePath: string;
}) {
  return (
    <Box component="section" pt={{ base: 48, md: 80 }} pb={{ base: 40, md: 64 }}>
      <Container size="lg">
        {/* Mantine has no `alignItems` style prop and SimpleGrid takes no align prop, so this
            stays a `style`: the copy column centres against the taller mock column. */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48} style={{ alignItems: 'center' }}>
          <Stack gap="lg">
            <Badge variant="light" size="lg" radius="sm" w="fit-content">
              v{stats.version} · open source
            </Badge>
            <Title order={1} fz={{ base: 36, md: 52 }} lh={1.08} fw={800}>
              Fullstack Bun yang siap produksi, bukan sekadar starter.
            </Title>
            <Text size="lg" c="dimmed" maw={560}>
              {appName} menyatukan Elysia, React Router SSR, Drizzle, dan Better Auth dalam satu
              proses, lalu menambahkan konsol admin lengkap: user, sesi, log, audit, rate limit, dan
              settings runtime. {tagline}.
            </Text>
            <Group gap="sm" wrap="wrap">
              <Button
                component={Link}
                to={signedIn ? homePath : '/login'}
                size="md"
                rightSection={<FiArrowRight size="1.25em" aria-hidden />}
                prefetch="intent"
              >
                {signedIn ? 'Buka konsol' : 'Coba konsolnya'}
              </Button>
              <Button
                component="a"
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                size="md"
                variant="default"
                leftSection={<FiGithub size="1.25em" aria-hidden />}
              >
                Lihat di GitHub
              </Button>
            </Group>
            <Group gap="xs" wrap="wrap">
              {TRUST.map((t) => (
                <Group key={t} gap={4} wrap="nowrap">
                  <FiCheck size="1.25em" color="var(--mantine-color-ok-6)" aria-hidden />
                  <Text size="sm" c="dimmed">
                    {t}
                  </Text>
                </Group>
              ))}
            </Group>
          </Stack>
          <Stack gap="md">
            <Paper withBorder radius="lg" p="md" bg="dark.8" c="gray.2">
              <Group gap="xs" mb="sm">
                {WINDOW_CONTROLS.map((color) => (
                  <Box
                    key={color}
                    w={WINDOW_CONTROL_SIZE}
                    h={WINDOW_CONTROL_SIZE}
                    bdrs="50%"
                    bg={color}
                  />
                ))}
                <Text size="xs" c="gray.5" ml="xs">
                  terminal
                </Text>
              </Group>
              <Code block bg="transparent" c="gray.2" fz={CODE_FONT_SIZE} p={0}>
                {`$ bun install && bun run db:migrate
$ bun run dev
🚀 ${appName} dev server on http://localhost:3005
   API + SSR + HMR — satu port, tanpa proxy

$ bun run build:binary -- --all
✓ dist/  linux + macOS, x64 + arm64  (runtime + SSR + assets)`}
              </Code>
            </Paper>
            <Paper withBorder radius="lg" p="md">
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <Stat value={String(stats.consolePages)} label="halaman konsol" />
                <Stat value={String(stats.tables)} label="tabel siap pakai" />
                <Stat value={String(stats.mcpTools)} label="tool MCP untuk agent" />
                <Stat
                  value={stats.testFiles > 0 ? String(stats.testFiles) : '—'}
                  label="file test"
                />
              </SimpleGrid>
            </Paper>
          </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
