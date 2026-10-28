// Project detail ⑧ Overview (prototype projects.detail.jsx ProjectsOverview): progress and time, the phase steps with
// the next milestone, the tasks needing attention (each opens its task) and the recent activity. Each part reads its
// own server data and loads or fails on its own.
import { router } from 'expo-router';
import { CalendarClock, CircleAlert, Clock, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Row, Rows } from '@/components/list/rows';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { projectActivityResource, projectPlanResource, projectResource } from '@/data/projects.api';
import { type AttentionReason, projectAttentionResource } from '@/data/projects.overview.api';
import {
  getProjectActivity,
  getProjectAttention,
  getProjectProgress,
  getProjectSteps,
} from '@/data/projects.view';
import type { PhaseStatusWire } from '@/data/projects.wire';

import { Bar, Head, Note, Sec } from '../parts/display';
import { Loaded } from '../parts/loaded';
import { OVERVIEW } from '../projects.strings';
import { NAMES, STEP_STATE } from '../projects.strings.added';

const REASON_ICON: Record<AttentionReason, LucideIcon> = {
  Overdue: CircleAlert,
  'Awaiting review': Clock,
  'Due today': CalendarClock,
};

function Pct({ label, value, percent }: { label: string; value: number; percent: string }) {
  return (
    <VStack className="gap-1">
      {/* The bar is named by the label, so the visible one is not read again. */}
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="text-subhead"
      >
        {label}
      </Text>
      <Bar value={value} label={label} percent={percent} />
    </VStack>
  );
}

type Step = { id: string; name: string; state: PhaseStatusWire };

/** One dot per phase, read as "<name>, done": ✓ when done, a ring with a dot for the one in progress (not colour alone). */
function Steps({ steps }: { steps: readonly Step[] }) {
  return (
    <HStack className="gap-2">
      {steps.map((s) => (
        <VStack
          key={s.id}
          accessible
          accessibilityLabel={`${s.name}, ${STEP_STATE[s.state]}`}
          className="flex-1 items-center gap-1"
        >
          <View
            className={`h-6 w-6 items-center justify-center rounded-full ${s.state === 'done' ? 'bg-atlas' : s.state === 'in_progress' ? 'border-2 border-atlas' : 'bg-muted'}`}
          >
            {s.state === 'done' && (
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="text-footnote text-card"
              >
                ✓
              </Text>
            )}
            {s.state === 'in_progress' && <View className="h-2 w-2 rounded-full bg-atlas" />}
          </View>
          <Text className="text-footnote" numberOfLines={1}>
            {s.name}
          </Text>
        </VStack>
      ))}
    </HStack>
  );
}

function Progress({ id }: { id: string }) {
  const o = getProjectProgress(id);
  if (!o) return null;
  return (
    <Sec title={OVERVIEW.progress}>
      <Pct label={OVERVIEW.tasksDone} value={o.progress} percent={o.percent} />
      {o.elapsed !== null && (
        <Pct label={OVERVIEW.elapsed} value={o.elapsed} percent={OVERVIEW.percent(o.elapsed)} />
      )}
      <Note>{o.timeLine}</Note>
    </Sec>
  );
}

function Plan({ id, onPhases }: { id: string; onPhases: () => void }) {
  const o = getProjectSteps(id);
  if (!o) return null;
  if (!o.steps.length && !o.milestone) return <Note>{OVERVIEW.noPhases}</Note>;
  return (
    <>
      {o.steps.length > 0 && <Steps steps={o.steps} />}
      {o.now && <Text className="text-subhead font-semibold">{o.now}</Text>}
      {o.milestone && (
        <VStack className="gap-1">
          <Text className="text-subhead">{o.milestone.name}</Text>
          <Note>{o.milestone.line}</Note>
        </VStack>
      )}
      <Button
        variant="link"
        className="self-start"
        accessibilityLabel={NAMES.allPhases}
        onPress={onPhases}
      >
        <ButtonText>{OVERVIEW.allPhases}</ButtonText>
      </Button>
    </>
  );
}

function Attention({ id }: { id: string }) {
  const rows = getProjectAttention(id) ?? [];
  if (!rows.length) return <Note>{OVERVIEW.noAttention}</Note>;
  return (
    <Rows testID="project-attention">
      {rows.map((a) => (
        <Row
          key={a.id}
          title={a.title}
          sub={a.sub}
          accessibilityLabel={`${a.reason}: ${a.title}, ${a.sub}`}
          lead={<Icon as={REASON_ICON[a.reason]} size="lg" className="text-atlas" />}
          onPress={() => router.push(`/tasks/${a.no}`)}
        />
      ))}
    </Rows>
  );
}

function Activity({ id }: { id: string }) {
  const rows = getProjectActivity(id) ?? [];
  if (!rows.length) return <Note>{OVERVIEW.noActivity}</Note>;
  return (
    <Rows testID="project-activity">
      {rows.map((a) => (
        <Row key={a.id} title={a.text} right={<Note>{a.on}</Note>} />
      ))}
    </Rows>
  );
}

/** The Overview tab of project id. */
export function OverviewTab({ id, onPhases }: { id: string; onPhases: () => void }) {
  return (
    <>
      <Loaded res={projectResource(id)} testID="overview-progress">
        {() => <Progress id={id} />}
      </Loaded>
      <Sec title={OVERVIEW.phases}>
        <Loaded res={projectPlanResource(id)} testID="overview-plan">
          {() => <Plan id={id} onPhases={onPhases} />}
        </Loaded>
      </Sec>
      <Head>{OVERVIEW.attention}</Head>
      <Loaded res={projectAttentionResource(id)} testID="overview-attention">
        {() => <Attention id={id} />}
      </Loaded>
      <Head>{OVERVIEW.activity}</Head>
      <Loaded res={projectActivityResource(id)} testID="overview-activity">
        {() => <Activity id={id} />}
      </Loaded>
    </>
  );
}
