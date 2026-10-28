// Project detail ⑩ Phases (prototype projects.tabs.jsx ProjectsPhases) from the server's plan: a card per phase with
// its range, status, progress and milestones, the milestones of no phase, then the deadline history (each extension's
// category and the manager's own reason, as it came).
import { StatusPill } from '@/components/status/status-pill';
import { Badge, BadgeText } from '@/components/ui/badge';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { projectExtensionsResource, projectPlanResource } from '@/data/projects.api';
import {
  getDeadlineHistory,
  getProjectPhases,
  type PhaseCard as Phase,
} from '@/data/projects.view.tabs';

import { Bar, Note, Sec, Soft } from '../parts/display';
import { Loaded } from '../parts/loaded';
import { OVERVIEW, PHASES } from '../projects.strings';

type Milestone = Phase['milestones'][number];

function Milestones({ title, rows }: { title: string; rows: readonly Milestone[] }) {
  return (
    <VStack className="gap-1">
      <Text className="text-subhead font-semibold">{title}</Text>
      {rows.map((m) => (
        <VStack key={m.id} accessible accessibilityLabel={`${m.name}, ${m.line}`}>
          <Text className="text-subhead">{m.name}</Text>
          <Note>{m.line}</Note>
        </VStack>
      ))}
    </VStack>
  );
}

function PhaseCard({ ph }: { ph: Phase }) {
  const done = ph.status === 'done';
  return (
    <Sec strong={ph.now} testID={`phase-${ph.id}`}>
      <HStack className="items-center gap-3">
        <VStack
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className={`h-8 w-8 items-center justify-center rounded-full ${done ? 'bg-atlas' : 'bg-muted'}`}
        >
          <Text className={`text-subhead font-semibold ${done ? 'text-card' : ''}`}>{ph.mark}</Text>
        </VStack>
        <VStack className="flex-1 gap-1">
          <Text className="text-headline font-semibold">{ph.name}</Text>
          <Note>{ph.range}</Note>
        </VStack>
        <StatusPill status={ph.state} />
      </HStack>
      {ph.pct === null ? (
        <Note>{PHASES.noProgress}</Note>
      ) : (
        <Bar value={ph.pct} label={ph.name} percent={OVERVIEW.percent(ph.pct)} />
      )}
      {ph.milestones.length > 0 && <Milestones title={PHASES.milestone} rows={ph.milestones} />}
    </Sec>
  );
}

function Plan({ id }: { id: string }) {
  const p = getProjectPhases(id);
  if (!p) return null;
  return (
    <>
      <Note>{p.cards.length ? p.count : PHASES.none}</Note>
      {p.cards.map((ph) => (
        <PhaseCard key={ph.id} ph={ph} />
      ))}
      {p.loose.length > 0 && (
        <Sec testID="phase-loose">
          <Milestones title={PHASES.loose} rows={p.loose} />
        </Sec>
      )}
    </>
  );
}

/** Nothing when the deadline never moved. */
function History({ id }: { id: string }) {
  const h = getDeadlineHistory(id);
  if (!h) return null;
  return (
    <Soft testID="deadline-history">
      <Text accessibilityRole="header" className="text-headline font-semibold">
        {PHASES.history}
      </Text>
      {h.original && <Note>{h.original}</Note>}
      {h.rows.map((r) => (
        <VStack key={r.id} className="gap-1">
          <HStack className="items-center justify-between gap-2">
            <Text className="flex-1 font-semibold">{r.change}</Text>
            <Badge variant="outline">
              <BadgeText>{r.category}</BadgeText>
            </Badge>
          </HStack>
          {!!r.reason && <Text className="text-subhead">{r.reason}</Text>}
          <Note>{r.by}</Note>
        </VStack>
      ))}
      {h.more && <Note>{h.more}</Note>}
    </Soft>
  );
}

/** The Phases tab of project id. */
export function PhasesTab({ id }: { id: string }) {
  return (
    <>
      <Loaded res={projectPlanResource(id)} testID="phases">
        {() => <Plan id={id} />}
      </Loaded>
      <Loaded res={projectExtensionsResource(id)} testID="history">
        {() => <History id={id} />}
      </Loaded>
    </>
  );
}
