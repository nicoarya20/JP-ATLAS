/** "List | Grid | Gantt" switch of the project list; the value lives in the URL (`?tampilan=`). */
import { Center, SegmentedControl } from '@mantine/core';
import type { IconType } from 'react-icons';
import { FiBarChart2, FiGrid, FiList } from 'react-icons/fi';
import { VIEW_SLUGS, type ViewSlug } from '~/lib/projects-filters';
import { VIEW_COPY } from './projects.copy';

const ICONS: Record<ViewSlug, IconType> = { list: FiList, grid: FiGrid, gantt: FiBarChart2 };

type Props = { value: ViewSlug; onChange: (view: ViewSlug) => void };

/** Every option has a visible word plus a longer Indonesian hint as tooltip (`title`), never an icon alone. */
export function ViewToggle({ value, onChange }: Props) {
  return (
    <SegmentedControl
      value={value}
      onChange={(v) => onChange(v as ViewSlug)}
      aria-label={VIEW_COPY.label}
      data={VIEW_SLUGS.map((slug) => {
        const Icon = ICONS[slug];
        return {
          value: slug,
          label: (
            <Center title={VIEW_COPY[slug].hint} style={{ gap: 'var(--mantine-spacing-xs)' }}>
              <Icon size="1.25em" aria-hidden />
              <span>{VIEW_COPY[slug].label}</span>
            </Center>
          ),
        };
      })}
    />
  );
}
