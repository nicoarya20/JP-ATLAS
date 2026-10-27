// Project detail ⑩ Phases (prototype projects.tabs.jsx ProjectsPhases): a card per phase with its range, status,
// progress and milestones, then the deadline history.
//
// Start phase and Complete phase are real writes now (`PATCH /projects/:id/phases/:phaseId`), with a busy button, a
// notice on success and the server's own sentence on refusal. "+ Phase" and "+ Milestone" are not: both routes exist,
// but neither has a form on this side yet, so they are left out rather than drawn as buttons that only say "later".
// Listed in docs/phase2-gap-disembunyikan.md.
import { useEffect, useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { StatusPill } from '@/components/status/status-pill';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { setPhaseStatus } from '@/data/projects.api.write';
import {
  ensureProjectPhases,
  type ProjectPhases,
  reloadProjectPhases,
  useProjectPhases,
} from '@/data/projects.detail';

import { Bar, Note, Sec, Soft } from '../parts/display';
import { OVERVIEW, PHASES } from '../projects.strings';

type Card = ProjectPhases['cards'][number];

function PhaseCard({ ph, id }: { ph: Card; id: string }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const b = ph.button;
  const run = async () => {
    if (!b) return;
    setBusy(true);
    try {
      await setPhaseStatus(id, ph.id, b.status);
      notice(b.notice);
    } catch (e) {
      // The server's own message, as it came (K5); never swallowed and never guessed at.
      notice(e instanceof Error ? e.message : PHASES.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sec strong={ph.now} testID={`phase-${ph.name}`}>
      <HStack className="items-center gap-3">
        <VStack
          className={`h-8 w-8 items-center justify-center rounded-full ${ph.mark === '✓' ? 'bg-atlas' : 'bg-muted'}`}
        >
          <Text className={`text-subhead font-semibold ${ph.mark === '✓' ? 'text-card' : ''}`}>
            {ph.mark}
          </Text>
        </VStack>
        <VStack className="flex-1 gap-1">
          <Text className="text-headline font-semibold">{ph.name}</Text>
          <Note>{ph.range}</Note>
        </VStack>
        <StatusPill status={ph.state} />
      </HStack>
      {/* A phase with no tasks shows no bar: 0 % would read as "nothing done", not "nothing to do". */}
      {ph.pct === null ? (
        <Note>{ph.tasksLine}</Note>
      ) : (
        <>
          <Bar value={ph.pct} label={ph.name} percent={OVERVIEW.percent(ph.pct)} />
          <Note>{ph.tasksLine}</Note>
        </>
      )}
      {ph.milestones.length > 0 && (
        <VStack className="gap-1">
          <Text className="text-subhead font-semibold">{PHASES.milestone}</Text>
          {ph.milestones.map((m) => (
            <VStack key={m.id} className="gap-1">
              <Text className="text-subhead">{m.name}</Text>
              <Note>{m.line}</Note>
            </VStack>
          ))}
        </VStack>
      )}
      {b && (
        <Button
          size="sm"
          variant={b.primary ? 'default' : 'outline'}
          isDisabled={busy}
          accessibilityState={{ busy, disabled: busy }}
          onPress={() => void run()}
        >
          {busy && <ButtonSpinner />}
          <ButtonText>{b.label}</ButtonText>
        </Button>
      )}
    </Sec>
  );
}

/** The Phases tab of project `id`. */
export function PhasesTab({ id }: { id: string }) {
  const p = useProjectPhases(id);
  useEffect(() => {
    void ensureProjectPhases(id);
  }, [id]);
  if (p.phase === 'failed' && p.cards.length === 0) {
    return (
      <FailedState
        testID="project-phases-failed"
        message={p.error?.message}
        onRetry={() => void reloadProjectPhases(id)}
      />
    );
  }
  if (p.count === null) return <LoadingState testID="project-phases-loading" />;
  return (
    <>
      <Note>{p.cards.length ? p.count : PHASES.none}</Note>
      {p.cards.map((ph) => (
        <PhaseCard key={ph.id} ph={ph} id={id} />
      ))}
      {p.loose.length > 0 && (
        <Sec title={PHASES.looseMilestones}>
          {p.loose.map((m) => (
            <VStack key={m.id} className="gap-1">
              <Text className="text-subhead">{m.name}</Text>
              <Note>{m.line}</Note>
            </VStack>
          ))}
        </Sec>
      )}
      {p.history && (
        <Soft testID="deadline-history">
          <Text accessibilityRole="header" className="text-headline font-semibold">
            {PHASES.history}
          </Text>
          {p.history.original && <Note>{p.history.original}</Note>}
          {p.history.rows.map((r) => (
            <VStack key={r.id} className="gap-1">
              <HStack className="items-center justify-between gap-2">
                <Text className="flex-1 font-semibold">{r.change}</Text>
                <Badge variant="outline">
                  <BadgeText>{r.category}</BadgeText>
                </Badge>
              </HStack>
              {/* The manager's own words, shown as they wrote them. */}
              <Text className="text-subhead">{r.note}</Text>
              <Note>{r.by}</Note>
            </VStack>
          ))}
          {p.history.more && <Note>{p.history.more}</Note>}
        </Soft>
      )}
    </>
  );
}
