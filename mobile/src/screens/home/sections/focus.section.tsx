import type { Href } from 'expo-router';

import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import type { HomeFocus } from '@/data/home.types';

import { FOCUS_GROUP, S } from '../home.strings';
import { TARGET_HREF, taskHref } from '../home.targets';
import { ListRow } from '../parts/list-row';
import { SectionCard } from '../parts/section-card';
import { EmptyLine, GroupLabel, SeeAll } from '../parts/small-parts';
import { FocusRow } from './focus.row';

type FocusSectionProps = {
  focus: HomeFocus;
  onOpen: (href: Href) => void;
  onDone: (no: number) => void;
};

/**
 * My Focus: Admin first gets the accounts awaiting approval; then my open tasks by Overdue / Today / This week; a PM
 * also gets other people's tasks in review. Only the first Review (or Admin's Open) is lime: one lime per view.
 */
export function FocusSection({ focus, onOpen, onDone }: FocusSectionProps) {
  return (
    <SectionCard title={S.focus.title} sub={S.focus.sub}>
      {focus.pendingUsers !== null && (
        <VStack className="gap-2">
          <GroupLabel>{S.focus.needsAction}</GroupLabel>
          <ListRow
            soft
            title={S.focus.approve(focus.pendingUsers)}
            sub={S.focus.approveSub}
            onPress={() => onOpen(TARGET_HREF['users.approve'])}
            right={
              <Button size="sm" onPress={() => onOpen(TARGET_HREF['users.approve'])}>
                <ButtonText>{S.focus.open}</ButtonText>
              </Button>
            }
          />
        </VStack>
      )}
      {focus.groups
        .filter((g) => g.tasks.length)
        .map((g) => (
          <VStack key={g.key} className="gap-2">
            <GroupLabel>{FOCUS_GROUP[g.key]}</GroupLabel>
            {g.tasks.map((t) => (
              <FocusRow key={t.no} task={t} onOpen={() => onOpen(taskHref(t.no))} onDone={onDone} />
            ))}
          </VStack>
        ))}
      {focus.review.length > 0 && (
        <VStack className="gap-2">
          <GroupLabel>{S.focus.awaitingReview}</GroupLabel>
          {focus.review.map((t, i) => (
            <FocusRow
              key={t.no}
              task={t}
              onOpen={() => onOpen(taskHref(t.no))}
              onDone={onDone}
              action={{ label: S.focus.review, primary: i === 0 }}
            />
          ))}
        </VStack>
      )}
      {focus.empty && <EmptyLine>{S.focus.empty}</EmptyLine>}
      <SeeAll
        label={S.focus.seeAll(focus.openCount, focus.review.length)}
        onPress={() => onOpen(TARGET_HREF['tasks.my'])}
      />
    </SectionCard>
  );
}
