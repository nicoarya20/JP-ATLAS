import { Anchor, Divider, Group, Text } from '@mantine/core';
import type { HomeAgendaItem, HomeProject, Widget } from '@server/home/home.dto';
import { Link } from 'react-router';
import { SectionCard } from '~/components/ui/SectionCard';
import { HomeAgendaList } from './HomeAgendaList';
import { HomeProjectList } from './HomeProjectList';
import { type Retry, WidgetError } from './HomeSection';
import { HOME_COPY, HOME_LINKS } from './home.copy';

type Props = {
  agenda: Widget<HomeAgendaItem[]>;
  projects: Widget<HomeProject[]>;
  timeZone: string;
  retry: Retry;
};

/** "Agenda & Projects": my events of today and tomorrow, then my running projects; each half fails on its own. */
export function HomeAgenda({ agenda, projects, timeZone, retry }: Props) {
  return (
    <SectionCard title={HOME_COPY.agenda.title} subtitle={HOME_COPY.agenda.subtitle}>
      {agenda.ok ? (
        <HomeAgendaList items={agenda.data} timeZone={timeZone} />
      ) : (
        <WidgetError {...retry} />
      )}
      <Divider />
      <Group justify="space-between" wrap="wrap">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          {HOME_COPY.agenda.projects}
        </Text>
        <Anchor component={Link} to={HOME_LINKS.projects} size="sm" fw={600}>
          {HOME_COPY.more}
        </Anchor>
      </Group>
      {projects.ok ? <HomeProjectList items={projects.data} /> : <WidgetError {...retry} />}
    </SectionCard>
  );
}
