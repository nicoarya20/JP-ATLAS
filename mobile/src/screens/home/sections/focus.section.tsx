import type { Href } from 'expo-router';

import { VStack } from '@/components/ui/vstack';
import type { FocusTask, HomeData } from '@/data/home.types';

import { FOCUS_GROUP, S } from '../home.strings';
import { TARGET_HREF, taskHref } from '../home.targets';
import { SectionCard } from '../parts/section-card';
import { EmptyLine, GroupLabel, SeeAll } from '../parts/small-parts';
import { WidgetPart } from '../parts/widget-card';
import { FocusRow, ReviewRow } from './focus.row';

type FocusSectionProps = {
  focus: HomeData['focus'];
  onOpen: (href: Href) => void;
  onAction: (task: FocusTask) => void;
  /** The task whose button is working, so only that row shows a spinner. */
  busyId?: string | null;
  onRetry: () => void;
};

/**
 * My Focus: my open tasks in the server's own urgency order, bucketed by when they are due, then the
 * tasks waiting for my review. The approvals row the Admin used to get is gone with GAP A-9 — the
 * server sends those as Inbox cards, not as a number of its own.
 */
export function FocusSection({ focus, onOpen, onAction, busyId, onRetry }: FocusSectionProps) {
  return (
    <SectionCard title={S.focus.title} sub={S.focus.sub}>
      <WidgetPart section={focus} onRetry={onRetry} testID="focus-failed">
        {(data) => (
          <>
            {data.groups
              .filter((g) => g.tasks.length)
              .map((g) => (
                <VStack key={g.key} className="gap-2">
                  <GroupLabel>{FOCUS_GROUP[g.key]}</GroupLabel>
                  {g.tasks.map((t) => (
                    <FocusRow
                      key={t.id}
                      task={t}
                      busy={busyId === t.id}
                      onOpen={() => onOpen(taskHref(t.no))}
                      onAction={onAction}
                    />
                  ))}
                </VStack>
              ))}
            {data.review.length > 0 && (
              <VStack className="gap-2">
                <GroupLabel>{S.focus.awaitingReview}</GroupLabel>
                {data.review.map((t, i) => (
                  <ReviewRow
                    key={t.id}
                    task={t}
                    primary={i === 0}
                    onOpen={() => onOpen(taskHref(t.no))}
                  />
                ))}
              </VStack>
            )}
            {data.empty && <EmptyLine>{S.focus.empty}</EmptyLine>}
            <SeeAll
              label={S.focus.seeAll(data.openCount, data.reviewCount)}
              onPress={() => onOpen(TARGET_HREF['tasks.my'])}
            />
          </>
        )}
      </WidgetPart>
    </SectionCard>
  );
}
