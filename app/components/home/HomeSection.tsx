/** A Beranda card whose body is one `Widget`: the data when it loaded, a retry prompt when it did not. */
import { Button, Stack, Text } from '@mantine/core';
import type { Widget } from '@server/home/home.dto';
import type { ReactNode } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { type AccentColor, SectionCard } from '~/components/ui/SectionCard';
import { HOME_COPY } from './home.copy';

/** One refetch for the whole page; every failed card shares it and shows the same spinner. */
export type Retry = { onRetry: () => void; retrying: boolean };

/** "Bagian ini belum bisa dimuat." with a button that reloads the page data. */
export function WidgetError({ onRetry, retrying }: Retry) {
  return (
    <Stack gap="xs" align="flex-start" role="alert">
      <Text size="sm" c="dimmed">
        {HOME_COPY.error}
      </Text>
      <Button
        variant="light"
        leftSection={<FiRefreshCw size="1.25em" aria-hidden />}
        loading={retrying}
        onClick={onRetry}
      >
        {HOME_COPY.retry}
      </Button>
    </Stack>
  );
}

type Props<T> = {
  title: string;
  subtitle?: string;
  accent?: AccentColor;
  widget: Widget<T>;
  retry: Retry;
  children: (data: T) => ReactNode;
};

export function HomeSection<T>({ widget, retry, children, ...card }: Props<T>) {
  return (
    <SectionCard {...card}>
      {widget.ok ? children(widget.data) : <WidgetError {...retry} />}
    </SectionCard>
  );
}
