// Project detail ⑩ Phases (prototype projects.tabs.jsx ProjectsPhases) from the server's plan: a card per phase with
// its range, status, progress and milestones, the milestones of no phase, then the deadline history (each extension's
// category and the manager's own reason, as it came). Someone who may edit the project can Complete the phase in
// progress and Start the next one.
import { StatusPill } from '@/components/status/status-pill';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { projectExtensionsResource, projectPlanResource } from '@/data/projects.api';
import {
  getDeadlineHistory,
  getProjectPhases,
  type PhaseCard as Phase,
} from '@/data/projects.view.tabs';
import { setPhaseStatus } from '@/data/projects.write';

import { Bar, Note, Sec, Soft } from '../parts/display';
import { Loaded } from '../parts/loaded';
import { useBusyWrite } from '../parts/write-run';
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

type Write = ReturnType<typeof useBusyWrite>;

/** Start or Complete, busy while the server answers; a notice says how it went. */
function PhaseStep({ id, ph, w }: { id: string; ph: Phase; w: Write }) {
  if (!ph.step) return null;
  const complete = ph.step === 'complete';
  const busy = w.busy === ph.id;
  const go = () =>
    w.run(
      ph.id,
      () => setPhaseStatus(id, ph.id, complete ? 'done' : 'in_progress'),
      complete ? PHASES.completed : PHASES.started,
    );
  return (
    <Button
      size="sm"
      variant={complete ? 'default' : 'outline'}
      className="self-start"
      isDisabled={!!w.busy}
      accessibilityLabel={complete ? PHASES.completeLabel(ph.name) : PHASES.startLabel(ph.name)}
      onPress={() => void go()}
    >
      {busy && <ButtonSpinner />}
      <ButtonText>{complete ? PHASES.complete : PHASES.start}</ButtonText>
    </Button>
  );
}

function PhaseCard({ id, ph, w }: { id: string; ph: Phase; w: Write | null }) {
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
      {w && <PhaseStep id={id} ph={ph} w={w} />}
    </Sec>
  );
}

function Plan({ id, canEdit }: { id: string; canEdit: boolean }) {
  const w = useBusyWrite();
  const p = getProjectPhases(id);
  if (!p) return null;
  return (
    <>
      <Note>{p.cards.length ? p.count : PHASES.none}</Note>
      {p.cards.map((ph) => (
        <PhaseCard key={ph.id} id={id} ph={ph} w={canEdit ? w : null} />
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

/** The Phases tab of project id; canEdit: the server lets the viewer edit the project (`can.update`). */
export function PhasesTab({ id, canEdit }: { id: string; canEdit: boolean }) {
  return (
    <>
      <Loaded res={projectPlanResource(id)} testID="phases">
        {() => <Plan id={id} canEdit={canEdit} />}
      </Loaded>
      <Loaded res={projectExtensionsResource(id)} testID="history">
        {() => <History id={id} />}
      </Loaded>
    </>
  );
}
