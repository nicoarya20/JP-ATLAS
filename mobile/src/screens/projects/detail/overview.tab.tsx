// Project detail ⑧ Overview (prototype projects.detail.jsx ProjectsOverview): progress and time, the phase steps with
// the next milestone, the tasks needing attention (each opens its task) and the recent activity.
//
// The tab is five requests, so each section carries its own state: one that failed says so in its own place with its
// own Try again, and the rest of the page stays. The activity sentences are the server's, in Indonesian, shown as they
// came (K5, GAP A-8) — translating them in the client would mean a second source for the same words.
import { router } from 'expo-router';
import { CalendarClock, CircleAlert, Clock, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Row, Rows } from '@/components/list/rows';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { AttentionReason } from '@/data/projects.detail';
import {
  ensureProjectOverview,
  moreProjectActivity,
  type ProjectOverview,
  reloadProjectActivity,
  reloadProjectAttention,
  reloadProjectPlan,
  useProjectOverview,
} from '@/data/projects.detail';

import { Bar, Head, Note, Sec } from '../parts/display';
import { LIST, OVERVIEW } from '../projects.strings';
import { ADDED, NAMES, STEP_STATE } from '../projects.strings.added';

const REASON_ICON: Record<AttentionReason, LucideIcon> = {
  Overdue: CircleAlert,
  'Awaiting review': Clock,
  'Due today': CalendarClock,
};

function Pct({ label, value }: { label: string; value: number }) {
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
      <Bar value={value} label={label} percent={OVERVIEW.percent(value)} />
    </VStack>
  );
}

/** One dot per phase, read as "<name>, done": ✓ when done, a ring with a dot for the one in progress (not colour alone). */
function Steps({ steps }: { steps: ProjectOverview['plan']['steps'] }) {
  return (
    <HStack className="gap-2">
      {steps.map((s) => (
        <VStack
          key={s.name}
          accessible
          accessibilityLabel={`${s.name}, ${STEP_STATE[s.state]}`}
          className="flex-1 items-center gap-1"
        >
          <View
            className={`h-6 w-6 items-center justify-center rounded-full ${s.state === 'Done' ? 'bg-atlas' : s.state === 'In progress' ? 'border-2 border-atlas' : 'bg-muted'}`}
          >
            {s.state === 'Done' && (
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="text-footnote text-card"
              >
                ✓
              </Text>
            )}
            {s.state === 'In progress' && <View className="h-2 w-2 rounded-full bg-atlas" />}
          </View>
          <Text className="text-footnote" numberOfLines={1}>
            {s.name}
          </Text>
        </VStack>
      ))}
    </HStack>
  );
}

/** The phases section: its own loading, its own failure, its own Try again. */
function PlanSection({
  plan,
  onRetry,
  onPhases,
}: {
  plan: ProjectOverview['plan'];
  onRetry: () => void;
  onPhases: () => void;
}) {
  if (plan.phase === 'failed' && plan.steps.length === 0) {
    return (
      <FailedState testID="project-plan-failed" message={plan.error?.message} onRetry={onRetry} />
    );
  }
  if (plan.phase === 'loading' || plan.phase === 'empty') return <LoadingState />;
  if (plan.steps.length === 0) return <Note>{OVERVIEW.noPhases}</Note>;
  return (
    <>
      <Steps steps={plan.steps} />
      {plan.now && <Text className="text-subhead font-semibold">{plan.now}</Text>}
      {plan.milestone && (
        <VStack className="gap-1">
          <Text className="text-subhead">{plan.milestone.name}</Text>
          <Note>{plan.milestone.line}</Note>
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

/** The Overview tab of project `id`. */
export function OverviewTab({ id, onPhases }: { id: string; onPhases: () => void }) {
  const o = useProjectOverview(id);
  useEffect(() => {
    void ensureProjectOverview(id);
  }, [id]);
  if (!o) return <LoadingState testID="project-overview-loading" />;
  return (
    <>
      <Sec title={OVERVIEW.progress}>
        <Pct label={OVERVIEW.tasksDone} value={o.progress} />
        {o.elapsed !== null && <Pct label={OVERVIEW.elapsed} value={o.elapsed} />}
        <Note>{o.tasksLine}</Note>
        <Note>{o.timeLine}</Note>
      </Sec>
      <Sec title={OVERVIEW.phases}>
        <PlanSection plan={o.plan} onRetry={() => void reloadProjectPlan(id)} onPhases={onPhases} />
      </Sec>
      <Head>{OVERVIEW.attention}</Head>
      {o.attention.phase === 'failed' && o.attention.rows.length === 0 ? (
        <FailedState
          testID="project-attention-failed"
          message={o.attention.error?.message}
          onRetry={() => void reloadProjectAttention(id)}
        />
      ) : o.attention.phase === 'loading' && o.attention.rows.length === 0 ? (
        <LoadingState />
      ) : o.attention.rows.length ? (
        <Rows testID="project-attention">
          {o.attention.rows.map((a) => (
            <Row
              key={a.id}
              title={a.title}
              sub={a.sub}
              accessibilityLabel={`${a.reason}: ${a.title}, ${a.sub}, ${LIST.due(a.due)}`}
              lead={<Icon as={REASON_ICON[a.reason]} size="lg" className="text-atlas" />}
              onPress={() => router.push(`/tasks/${a.no}`)}
            />
          ))}
        </Rows>
      ) : (
        <Note>{OVERVIEW.noAttention}</Note>
      )}
      <Head>{OVERVIEW.activity}</Head>
      {o.activity.phase === 'failed' && o.activity.items.length === 0 ? (
        <FailedState
          testID="project-activity-failed"
          message={o.activity.error?.message}
          onRetry={() => void reloadProjectActivity(id)}
        />
      ) : o.activity.phase === 'loading' && o.activity.items.length === 0 ? (
        <LoadingState />
      ) : o.activity.items.length ? (
        <>
          <Rows testID="project-activity">
            {o.activity.items.map((a) => (
              <Row key={a.id} title={a.text} right={<Note>{a.on}</Note>} />
            ))}
          </Rows>
          {o.activity.hasMore && (
            <Button
              testID="project-activity-more"
              variant="outline"
              onPress={() => void moreProjectActivity(id)}
            >
              <ButtonText>{ADDED.more}</ButtonText>
            </Button>
          )}
        </>
      ) : (
        <Note>{OVERVIEW.noActivity}</Note>
      )}
    </>
  );
}
