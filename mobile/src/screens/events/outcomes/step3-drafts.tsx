// Draft tasks of Step 3 (prototype events.outcomes.jsx Draft / Drafts): title, owner and due date; one without a due
// date shows "Fill in the due date first" and, for a PM or Admin, a due picker. Edit is a notice, Remove (Admin:
// Discard) drops the draft. A Member sees no actions.

import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { monthDay } from '@/data/dates';
import { formDueDates } from '@/data/events.form';
import type { DraftTask } from '@/data/sample/events.extra';

import { SPOKEN } from '../events.strings.added';
import { OUTCOMES } from '../events.strings.outcomes';

/** "View" is a short link (about 36 pt wide): 8 pt each side reaches the 44 pt target without widening it. */
const VIEW_SLOP = { left: 8, right: 8 } as const;

const dueOptions = () => [{ value: '', label: OUTCOMES.pickDue }, ...formDueDates()];

/** What a PM or Admin may do to the drafts; left out for a Member. */
export type DraftEdit = {
  remove: (i: number) => void;
  due: (i: number, due: string) => void;
  discard: boolean;
};

type DraftsProps = {
  drafts: readonly DraftTask[];
  decisions: number;
  info: number;
  edit?: DraftEdit;
};

function Draft({ t, i, edit }: { t: DraftTask; i: number; edit?: DraftEdit }) {
  const notice = useNotice();
  const drop = edit?.discard ? OUTCOMES.discard : OUTCOMES.remove;
  return (
    <VStack testID="draft-task" className="gap-2 rounded-card bg-card p-3">
      <Text className="text-headline font-semibold text-foreground">{t.title}</Text>
      <HStack className="items-center gap-2">
        <Avatar className="h-6 w-6 bg-accent">
          <AvatarFallbackText className="text-footnote text-accent-foreground">
            {t.who}
          </AvatarFallbackText>
        </Avatar>
        <Text className="flex-1 text-footnote text-muted-foreground">
          {OUTCOMES.forWho(t.who, t.due ? monthDay(t.due) : '')}
        </Text>
      </HStack>
      {!t.due && (
        <Text className="text-footnote font-semibold text-warning">{OUTCOMES.fillDue}</Text>
      )}
      {!t.due && edit && (
        <SelectField
          label={OUTCOMES.dueLabel(t.title)}
          options={dueOptions()}
          value=""
          onChange={(due) => due && edit.due(i, due)}
        />
      )}
      {edit && (
        <HStack className="gap-2">
          <Button
            size="sm"
            variant="outline"
            accessibilityLabel={SPOKEN.draftAction(OUTCOMES.editTask, t.title)}
            onPress={() => notice(OUTCOMES.editNotice)}
          >
            <ButtonText>{OUTCOMES.editTask}</ButtonText>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            accessibilityLabel={SPOKEN.draftAction(drop, t.title)}
            onPress={() => edit.remove(i)}
          >
            <ButtonText>{drop}</ButtonText>
          </Button>
        </HStack>
      )}
    </VStack>
  );
}

/** The drafts, then the "1 decision, 1 info, 1 question" line with its View. */
export function Drafts({ drafts, decisions, info, edit }: DraftsProps) {
  const notice = useNotice();
  return (
    <>
      {drafts.map((t, i) => (
        <Draft key={t.title} t={t} i={i} edit={edit} />
      ))}
      <HStack className="items-center justify-between gap-2 rounded-card bg-muted px-3">
        <Text className="flex-1 text-subhead text-foreground">
          {OUTCOMES.summary(decisions, info)}
        </Text>
        <Button variant="link" hitSlop={VIEW_SLOP} onPress={() => notice(OUTCOMES.viewNotice)}>
          <ButtonText>{OUTCOMES.view}</ButtonText>
        </Button>
      </HStack>
    </>
  );
}
