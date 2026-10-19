/** "Atur kondisi" and "Hapus penimpaan kondisi" entries of the project ⋯ menu; clearing asks first (T2). */
import { Menu } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectDetail } from '@server/project/project.dto';
import { FiSliders, FiXCircle } from 'react-icons/fi';
import { confirmAction } from '~/components/ui/confirmAction';
import { clearConditionOverride } from '~/lib/project-deadline-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { openConditionOverrideModal } from './ConditionOverrideModal';
import { canClearCondition, canSetCondition } from './header-caps';
import { OVERRIDE_COPY } from './summary.copy';
import { useRefreshProject } from './useRefreshProject';

export type OverrideMenuData = Pick<ProjectDetail, 'id' | 'can' | 'status' | 'conditionOverride'>;

/** True when at least one of the two entries shows, so the parent can decide whether to draw the menu. */
export const hasOverrideItems = (p: OverrideMenuData): boolean =>
  canSetCondition(p) || canClearCondition(p);

export function OverrideMenuItems({
  project,
  today,
}: {
  project: OverrideMenuData;
  today: IsoDate;
}) {
  const refresh = useRefreshProject();
  const clear = useApiMutation({
    mutationFn: () => clearConditionOverride(project.id),
    successMessage: OVERRIDE_COPY.cleared,
    errorTitle: OVERRIDE_COPY.clearFailed,
    onSuccess: refresh,
  });
  return (
    <>
      {canSetCondition(project) && (
        <Menu.Item
          leftSection={<FiSliders size="1.25em" aria-hidden />}
          onClick={() => openConditionOverrideModal({ projectId: project.id, today })}
        >
          {OVERRIDE_COPY.menuSet}
        </Menu.Item>
      )}
      {canClearCondition(project) && (
        <Menu.Item
          leftSection={<FiXCircle size="1.25em" aria-hidden />}
          disabled={clear.loading}
          onClick={() =>
            confirmAction({
              title: OVERRIDE_COPY.clearTitle,
              body: OVERRIDE_COPY.clearBody,
              confirmLabel: OVERRIDE_COPY.clearConfirm,
              onConfirm: () => void clear.run(undefined),
            })
          }
        >
          {OVERRIDE_COPY.menuClear}
        </Menu.Item>
      )}
    </>
  );
}
