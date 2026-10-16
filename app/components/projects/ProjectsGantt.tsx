import { Anchor, Box, Group, SegmentedControl, Text } from '@mantine/core';
import { diffDays } from '@server/metrics/dates';
import { FiBarChart2 } from 'react-icons/fi';
import { Link } from 'react-router';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { EmptyState } from '~/components/ui/EmptyState';
import { DUMMY_TODAY } from '~/lib/dummy-clock';
import { CONDITION_LABELS } from '~/lib/pm-labels';
import type { DummyProject } from './projects.dummy';
import {
  barBox,
  monthSpans,
  PX_PER_DAY,
  rangeOf,
  type Span,
  tickSpans,
  totalDays,
  ZOOMS,
  type Zoom,
} from './projects.gantt';

const ROW_H = 64;
const HEAD_H = 32;
const LEFT_W = { base: 150, sm: 260 };
const LEFT_BG = 'var(--mantine-color-body)';
const LINE = '1px solid var(--mantine-color-default-border)';

const percent = (p: DummyProject) => (p.total === 0 ? 0 : Math.round((p.done / p.total) * 100));

function HeaderRow({ spans, px, height }: { spans: Span[]; px: number; height: number }) {
  return (
    <Box style={{ display: 'flex', height, borderBottom: LINE }}>
      {spans.map((s, i) => (
        <Text
          // biome-ignore lint/suspicious/noArrayIndexKey: header cells are static and ordered; labels (day numbers) repeat
          key={i}
          size="xs"
          c="dimmed"
          ta="center"
          truncate
          style={{ width: s.days * px, flexShrink: 0, lineHeight: `${height}px`, borderLeft: LINE }}
        >
          {s.label}
        </Text>
      ))}
    </Box>
  );
}

function Bar({ p, rangeStart, zoom }: { p: DummyProject; rangeStart: string; zoom: Zoom }) {
  const { left, width } = barBox(rangeStart, p, zoom);
  const color = CONDITION_LABELS[p.condition].color;
  const pct = percent(p);
  return (
    <Anchor
      component={Link}
      to={`/app/projects/${p.id}`}
      aria-label={`${p.name}, progres ${pct}%, tenggat ${p.due}`}
      title={`${p.name} · ${pct}%`}
      style={{
        position: 'absolute',
        left,
        width,
        top: (ROW_H - 32) / 2,
        height: 32,
        overflow: 'hidden',
        borderRadius: 'var(--mantine-radius-sm)',
        border: `1px solid var(--mantine-color-${color}-filled)`,
        background: `var(--mantine-color-${color}-light)`,
        color: 'var(--mantine-color-text)',
        textDecoration: 'none',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: `${pct}%`,
          background: `var(--mantine-color-${color}-light-hover)`,
        }}
      />
      <Text size="xs" fw={600} truncate px={6} style={{ position: 'relative', lineHeight: '30px' }}>
        {`${p.name} · ${pct}%`}
      </Text>
    </Anchor>
  );
}

type Props = { rows: DummyProject[]; zoom: Zoom; onZoom: (z: Zoom) => void };

/** Timeline of project start–due spans, bar tinted by condition and filled to the task progress. */
export function ProjectsGantt({ rows, zoom, onZoom }: Props) {
  const range = rangeOf(rows);
  if (!range) {
    return (
      <EmptyState
        icon={FiBarChart2}
        title="Belum ada proyek yang cocok"
        description="Coba ubah kata kunci atau pilih status lain."
      />
    );
  }
  const px = PX_PER_DAY[zoom];
  const width = totalDays(range) * px;
  const todayX = diffDays(range.start, DUMMY_TODAY) * px + px / 2;
  const showToday = todayX >= 0 && todayX <= width;
  const ticks = tickSpans(range, zoom);

  return (
    <>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text size="sm" c="dimmed">{`${rows.length} proyek · klik bar untuk melihat detail`}</Text>
        <SegmentedControl
          aria-label="Skala waktu"
          value={zoom}
          onChange={(v) => onZoom(v as Zoom)}
          data={ZOOMS}
        />
      </Group>
      <Box
        style={{ overflowX: 'auto', border: LINE, borderRadius: 'var(--mantine-radius-md)' }}
        role="region"
        aria-label="Linimasa proyek"
        tabIndex={0}
      >
        <Box style={{ display: 'flex', minWidth: 'max-content' }}>
          <Box
            w={LEFT_W}
            style={{
              position: 'sticky',
              left: 0,
              zIndex: 2,
              background: LEFT_BG,
              borderRight: LINE,
              flexShrink: 0,
            }}
          >
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              c="dimmed"
              px="sm"
              style={{
                height: HEAD_H * (ticks.length ? 2 : 1),
                lineHeight: `${HEAD_H * (ticks.length ? 2 : 1)}px`,
                borderBottom: LINE,
              }}
            >
              Proyek
            </Text>
            {rows.map((p) => (
              <Box
                key={p.id}
                px="sm"
                style={{
                  height: ROW_H,
                  borderBottom: LINE,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 2,
                  overflow: 'hidden',
                }}
              >
                <Anchor
                  component={Link}
                  to={`/app/projects/${p.id}`}
                  fw={700}
                  c="inherit"
                  truncate
                  size="sm"
                >
                  {p.name}
                </Anchor>
                <Group gap={6} wrap="nowrap">
                  <StatusBadge status={p.status} />
                </Group>
              </Box>
            ))}
          </Box>
          <Box style={{ width, position: 'relative', flexShrink: 0 }}>
            <HeaderRow spans={monthSpans(range)} px={px} height={HEAD_H} />
            {ticks.length > 0 && <HeaderRow spans={ticks} px={px} height={HEAD_H} />}
            {rows.map((p) => (
              <Box key={p.id} style={{ position: 'relative', height: ROW_H, borderBottom: LINE }}>
                <Bar p={p} rangeStart={range.start} zoom={zoom} />
              </Box>
            ))}
            {showToday && (
              <Box
                aria-hidden
                title="Hari ini"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: todayX,
                  width: 2,
                  background: 'var(--mantine-color-danger-filled)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
}
