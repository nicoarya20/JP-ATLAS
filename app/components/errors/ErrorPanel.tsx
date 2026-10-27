import {
  Anchor,
  Box,
  Button,
  Code,
  Collapse,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCompass,
  FiHome,
  FiLock,
  FiLogIn,
  FiRefreshCw,
} from 'react-icons/fi';
import { Link, useLocation } from 'react-router';
import { type ErrorInfo, type ErrorKind, errorReference } from '~/lib/error-page';
import { useTimeFormat } from '~/lib/time-format';

const ICON: Record<ErrorKind, { icon: IconType; color: string }> = {
  'not-found': { icon: FiCompass, color: 'blue' },
  forbidden: { icon: FiLock, color: 'orange' },
  unauthorized: { icon: FiLogIn, color: 'yellow' },
  server: { icon: FiAlertTriangle, color: 'red' },
  unavailable: { icon: FiClock, color: 'gray' },
  other: { icon: FiAlertTriangle, color: 'orange' },
};

type Props = {
  info: ErrorInfo;
  /** Where "Ke beranda" goes — the area's home when inside a console, else "/". */
  homePath?: string;
  homeLabel?: string;
  /** Rendered inside a console shell (tighter, no page-level centering). */
  embedded?: boolean;
};

/**
 * The body of every error page: status, plain-language title/description,
 * what to do next, a support reference, and actions that actually help
 * (back, reload, home, login). Developer details only in development.
 */
/** Stack-trace size in px: below the 12px `xs` token, so a long trace fits without scrolling. */
const STACK_FONT_SIZE = 11;

export function ErrorPanel({
  info,
  homePath = '/',
  homeLabel = 'Ke beranda',
  embedded = false,
}: Props) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { icon: Icon, color } = ICON[info.kind];
  const { now, dateTime } = useTimeFormat();
  // Request time on SSR + hydration (identical text), render time for client-side errors.
  const [at] = useState(now);
  const reference = errorReference(at);
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
  const isServer = info.kind === 'server' || info.kind === 'unavailable';

  return (
    <Paper
      withBorder={embedded}
      radius="md"
      p={embedded ? { base: 'md', md: 'xl' } : 0}
      maw={560}
      w="100%"
      mx="auto"
      bg={embedded ? undefined : 'transparent'}
    >
      <Stack gap="md" align={embedded ? 'flex-start' : 'center'} ta={embedded ? 'left' : 'center'}>
        <Group gap="md" wrap="nowrap" align="center">
          <ThemeIcon size={56} radius="md" variant="light" color={color}>
            <Icon size={28} />
          </ThemeIcon>
          <Text fz={44} fw={800} lh={1} lts={-1} c="dimmed" opacity={0.6}>
            {info.status}
          </Text>
        </Group>
        <Box>
          <Text component="h1" fz="xl" fw={700} lh={1.2} m={0}>
            {info.title}
          </Text>
          <Text size="sm" c="dimmed" mt={4}>
            {info.description}
          </Text>
          <Text size="sm" mt={4}>
            {info.hint}
          </Text>
        </Box>
        {/* No `wordBreak` prop in Mantine; a long path has no spaces, and the reference line is
            what someone reports to support, so none of it may be cut. */}
        <Text size="xs" c="dimmed" ff="monospace" style={{ wordBreak: 'break-all' }}>
          {pathname}
          {isServer ? ` · ${reference} · ${dateTime(new Date(at).toISOString())}` : ''}
        </Text>
        <Group gap="xs" wrap="wrap" justify={embedded ? 'flex-start' : 'center'}>
          {canGoBack && (
            <Button
              size="sm"
              variant="default"
              leftSection={<FiArrowLeft size={14} />}
              onClick={() => window.history.back()}
            >
              Kembali
            </Button>
          )}
          {isServer && (
            <Button
              size="sm"
              variant="light"
              leftSection={<FiRefreshCw size={14} />}
              onClick={() => window.location.reload()}
            >
              Muat ulang
            </Button>
          )}
          {info.kind === 'unauthorized' ? (
            <Button size="sm" component={Link} to="/login" leftSection={<FiLogIn size={14} />}>
              Masuk
            </Button>
          ) : (
            <Button size="sm" component={Link} to={homePath} leftSection={<FiHome size={14} />}>
              {homeLabel}
            </Button>
          )}
        </Group>
        {info.detail && (
          <Stack gap={4} w="100%">
            <Anchor
              component="button"
              type="button"
              size="xs"
              c="dimmed"
              onClick={() => setOpen((o) => !o)}
            >
              <Group gap={4} component="span">
                {open ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                Detail teknis (hanya di development)
              </Group>
            </Anchor>
            <Collapse expanded={open}>
              {/* `fz`/`ta` are props; the pre-wrap has none and keeps a stack trace's own
                  line breaks instead of running it into one paragraph. */}
              <Code block fz={STACK_FONT_SIZE} ta="left" style={{ whiteSpace: 'pre-wrap' }}>
                {info.detail}
              </Code>
            </Collapse>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
