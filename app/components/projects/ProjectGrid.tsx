/** Grid view: the same project card as the mobile list, three columns on wide screens; the whole card is clickable. */
import { Paper, SimpleGrid, Stack } from '@mantine/core';
import { CLICK_CARD, ProjectCard } from './ProjectCard';
import { ProjectMore, type ProjectViewProps } from './ProjectMore';
import { LIST_COPY } from './projects.copy';

export function ProjectGrid({
  items,
  total,
  today,
  empty,
  hasMore,
  loadingMore,
  onMore,
}: ProjectViewProps) {
  if (items.length === 0) return <>{empty}</>;
  return (
    <Stack gap="md">
      <SimpleGrid
        cols={{ base: 1, sm: 2, lg: 3 }}
        spacing="sm"
        role="list"
        aria-label={LIST_COPY.gridLabel}
      >
        {items.map((p) => (
          <Paper key={p.id} withBorder p="sm" radius="md" role="listitem" className={CLICK_CARD}>
            <ProjectCard project={p} today={today} />
          </Paper>
        ))}
      </SimpleGrid>
      <ProjectMore
        shown={items.length}
        total={total}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onMore={onMore}
      />
    </Stack>
  );
}
