import { Badge, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';
import { PROJECT_FORM_HREF } from '~/lib/project-create-mode';
import { CHOOSER_COPY } from './project-chooser.copy';

type Way = {
  id: 'form' | 'story' | 'template';
  title: string;
  body: string;
  note: string;
  /** Where "Pilih" goes; absent = not built yet, so the button is disabled instead of a dead link. */
  href?: string;
  recommended?: boolean;
};

const WAYS: readonly Way[] = [
  { id: 'form', ...CHOOSER_COPY.form, href: PROJECT_FORM_HREF },
  { id: 'story', ...CHOOSER_COPY.story, recommended: true },
  { id: 'template', ...CHOOSER_COPY.template },
];

/** The three ways to start a project (flow ②); only the form is built, the others say "Coming soon". */
export function ProjectCreateChooser() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      {WAYS.map((way) => (
        <WayCard key={way.id} way={way} />
      ))}
    </SimpleGrid>
  );
}

function WayCard({ way }: { way: Way }) {
  const titleId = `create-way-${way.id}`;
  return (
    <Paper
      component="section"
      aria-labelledby={titleId}
      withBorder
      p="lg"
      h="100%"
      // The recommended way carries the heavier border the wireframe gives it.
      bd={way.recommended ? '2px solid var(--mantine-color-text)' : undefined}
    >
      <Stack justify="space-between" h="100%" gap="md">
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
            {/* The handoff defines three heading sizes and no h4; a card title is a section (20 px). */}
            <Title order={3} id={titleId} miw={0}>
              {way.title}
              {/* A plain span, not a Box or Text: it is here to hide a decorative glyph from
                  screen readers, not to lay anything out. */}
              {way.id === 'story' && <span aria-hidden> ✦</span>}
            </Title>
            {way.recommended && (
              <Badge variant="filled" color="dark">
                {CHOOSER_COPY.recommended}
              </Badge>
            )}
          </Group>
          <Text>{way.body}</Text>
          <Text size="sm" c="dimmed">
            {way.note}
          </Text>
        </Stack>
        {way.href ? (
          <Button
            component={Link}
            to={way.href}
            fullWidth
            variant={way.recommended ? 'filled' : 'default'}
          >
            {CHOOSER_COPY.choose}
          </Button>
        ) : (
          // Disabled, and the label says why: nothing to click, nothing that fails silently.
          <Button fullWidth disabled variant={way.recommended ? 'filled' : 'default'}>
            {CHOOSER_COPY.comingSoon}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
