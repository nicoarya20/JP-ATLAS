// Project detail ⑩ Phases (prototype projects.tabs.jsx ProjectsPhases): a card per phase with its range, status,
// progress and milestone, then the deadline history. A Manager or Admin adds phases and milestones, completes the phase
// in progress and starts the next one (notices only in Phase 1, like the prototype).
import { useNotice } from '@/components/notice/use-notice';
import { StatusPill } from '@/components/status/status-pill';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { getProjectPhases } from '@/data/projects';

import { Bar, Note, Sec, Soft } from '../parts/project-parts';
import { OVERVIEW, PHASES } from '../projects.strings';

type Phases = ReturnType<typeof getProjectPhases>;

function PhaseCard({ ph, canEdit }: { ph: Phases['cards'][number]; canEdit: boolean }) {
  const notice = useNotice();
  const b = ph.button;
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
      {ph.pct ? (
        <Bar value={ph.pct} label={ph.name} percent={OVERVIEW.percent(ph.pct)} />
      ) : (
        <Note>{PHASES.noProgress}</Note>
      )}
      <VStack className="gap-1">
        <Text className="text-subhead font-semibold">{PHASES.milestone}</Text>
        {ph.milestone && (
          <>
            <Text className="text-subhead">{ph.milestone.name}</Text>
            <Note>{ph.milestone.line}</Note>
          </>
        )}
        {canEdit && (
          <Button
            variant="link"
            className="self-start"
            onPress={() => notice(PHASES.addMilestoneNotice)}
          >
            <ButtonText>{PHASES.addMilestone}</ButtonText>
          </Button>
        )}
      </VStack>
      {b && (
        <Button
          size="sm"
          variant={b.primary ? 'default' : 'outline'}
          onPress={() => notice(b.notice)}
        >
          <ButtonText>{b.label}</ButtonText>
        </Button>
      )}
    </Sec>
  );
}

/** The Phases tab of a project (`p` from getProjectPhases). */
export function PhasesTab({ p, canEdit }: { p: Phases; canEdit: boolean }) {
  const notice = useNotice();
  return (
    <>
      <HStack className="items-center justify-between gap-2">
        <Note>{p.cards.length ? p.count : PHASES.none}</Note>
        {canEdit && (
          <Button size="sm" variant="outline" onPress={() => notice(PHASES.addPhaseNotice)}>
            <ButtonText>{PHASES.addPhase}</ButtonText>
          </Button>
        )}
      </HStack>
      {p.cards.map((ph) => (
        <PhaseCard key={ph.name} ph={ph} canEdit={canEdit} />
      ))}
      {p.history && (
        <Soft testID="deadline-history">
          <Text accessibilityRole="header" className="text-headline font-semibold">
            {PHASES.history}
          </Text>
          <Note>{p.history.original}</Note>
          <HStack className="items-center justify-between gap-2">
            <Text className="flex-1 font-semibold">{p.history.change}</Text>
            <Badge variant="outline">
              <BadgeText>{p.history.reason}</BadgeText>
            </Badge>
          </HStack>
          <Text className="text-subhead">{p.history.by}</Text>
        </Soft>
      )}
    </>
  );
}
