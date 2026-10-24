// Project detail ⑧ Overview (prototype projects.detail.jsx ProjectsOverview): progress and time, the phase steps with
// the next milestone, the tasks needing attention (each opens its task) and the recent activity.
import { router } from 'expo-router';
import { CalendarClock, CircleAlert, Clock, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Row, Rows } from '@/components/list/rows';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { getProjectOverview } from '@/data/projects';
import type { AttentionReason } from '@/data/projects.detail';

import { Bar, Head, Note, Sec } from '../parts/project-parts';
import { OVERVIEW } from '../projects.strings';

type Overview = ReturnType<typeof getProjectOverview>;

const REASON_ICON: Record<AttentionReason, LucideIcon> = {
  Overdue: CircleAlert,
  'Awaiting review': Clock,
  'Due today': CalendarClock,
};

function Pct({ label, value }: { label: string; value: number }) {
  return (
    <VStack className="gap-1">
      <Text className="text-subhead">{label}</Text>
      <Bar value={value} label={label} percent={OVERVIEW.percent(value)} />
    </VStack>
  );
}

/** One dot per phase: ✓ when done, filled for the one in progress. */
function Steps({ steps }: { steps: Overview['steps'] }) {
  return (
    <HStack className="gap-2">
      {steps.map((s) => (
        <VStack key={s.name} className="flex-1 items-center gap-1">
          <View
            className={`h-6 w-6 items-center justify-center rounded-full ${s.state === 'Done' ? 'bg-atlas' : s.state === 'In progress' ? 'border-2 border-atlas' : 'bg-muted'}`}
          >
            {s.state === 'Done' && <Text className="text-footnote text-card">✓</Text>}
          </View>
          <Text className="text-footnote" numberOfLines={1}>
            {s.name}
          </Text>
        </VStack>
      ))}
    </HStack>
  );
}

/** The Overview tab of a project (`o` from getProjectOverview). */
export function OverviewTab({ o, onPhases }: { o: Overview; onPhases: () => void }) {
  return (
    <>
      <Sec title={OVERVIEW.progress}>
        <Pct label={OVERVIEW.tasksDone} value={o.progress} />
        {o.elapsed !== null && <Pct label={OVERVIEW.elapsed} value={o.elapsed} />}
        <Note>{o.timeLine}</Note>
      </Sec>
      <Sec title={OVERVIEW.phases}>
        {o.steps.length ? (
          <>
            <Steps steps={o.steps} />
            {o.now && <Text className="text-subhead font-semibold">{o.now}</Text>}
            {o.milestone && (
              <VStack className="gap-1">
                <Text className="text-subhead">{o.milestone.name}</Text>
                <Note>{o.milestone.line}</Note>
              </VStack>
            )}
            <Button variant="link" className="self-start" onPress={onPhases}>
              <ButtonText>{OVERVIEW.allPhases}</ButtonText>
            </Button>
          </>
        ) : (
          <Note>{OVERVIEW.noPhases}</Note>
        )}
      </Sec>
      <Head>{OVERVIEW.attention}</Head>
      {o.attention.length ? (
        <Rows testID="project-attention">
          {o.attention.map((a) => (
            <Row
              key={a.no}
              title={a.title}
              sub={a.sub}
              accessibilityLabel={`${a.reason}: ${a.title}`}
              lead={<Icon as={REASON_ICON[a.reason]} size="lg" className="text-atlas" />}
              onPress={() => router.push(`/tasks/${a.no}`)}
            />
          ))}
        </Rows>
      ) : (
        <Note>{OVERVIEW.noAttention}</Note>
      )}
      <Head>{OVERVIEW.activity}</Head>
      {o.activity.length ? (
        <Rows testID="project-activity">
          {o.activity.map((a) => (
            <Row key={`${a.on}-${a.text}`} title={a.text} right={<Note>{a.on}</Note>} />
          ))}
        </Rows>
      ) : (
        <Note>{OVERVIEW.noActivity}</Note>
      )}
    </>
  );
}
