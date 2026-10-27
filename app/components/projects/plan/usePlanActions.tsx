/** Phase and milestone writes with `loading`, toasts and cache refresh; both deletes ask first (T2). */
import type { MilestoneDto, PhaseDto } from '@server/project/project-plan.dto';
import { useState } from 'react';
import { confirmAction } from '~/components/ui/confirmAction';
import {
  createMilestone,
  createPhase,
  deleteMilestone,
  deletePhase,
  type PhaseInput,
  type PhasePatch,
  reorderPhases,
  setMilestoneReached,
  updateMilestone,
  updatePhase,
} from '~/lib/project-plan-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { useRefreshProject } from '../summary/useRefreshProject';
import { PLAN_ACTION_COPY as COPY, PLAN_CONFIRM_COPY } from './plan.copy';
import {
  type MilestoneFormValues,
  type PhaseFormValues,
  toMilestoneInput,
  toPhaseInput,
  toPhasePatch,
} from './plan-form';
import { type MoveDirection, movedOrder, type PlanBusy } from './plan-view';

export function usePlanActions(projectId: string, phases: readonly PhaseDto[]) {
  // A plan write can change the Ringkasan card, the lists and the header (a ticked milestone moves
  // the condition), and the header comes from the layout loader (PRJ-02).
  const refresh = useRefreshProject();
  const [busy, setBusy] = useState<PlanBusy>(null);
  /** Marks a row busy for the duration of one write; `run` never throws, so the reset always happens. */
  const track = async <T,>(marker: NonNullable<PlanBusy>, run: () => Promise<T>): Promise<T> => {
    setBusy(marker);
    try {
      return await run();
    } finally {
      setBusy(null);
    }
  };

  const addPhase = useApiMutation({
    mutationFn: (input: PhaseInput) => createPhase(projectId, input),
    successMessage: (saved) => COPY.phaseCreated(saved.name),
    errorTitle: COPY.phaseCreateFailed,
    onSuccess: refresh,
  });
  const editPhase = useApiMutation({
    mutationFn: ({ phase, patch }: { phase: PhaseDto; patch: PhasePatch }) =>
      updatePhase(projectId, phase.id, patch),
    successMessage: (saved) => COPY.phaseUpdated(saved.name),
    errorTitle: COPY.phaseUpdateFailed,
    onSuccess: refresh,
  });
  const reorder = useApiMutation({
    mutationFn: ({ ids }: { phase: PhaseDto; ids: string[] }) => reorderPhases(projectId, ids),
    successMessage: (_d, { phase }) => COPY.phaseMoved(phase.name),
    errorTitle: COPY.phaseMoveFailed,
    onSuccess: refresh,
    // A refused order means the list on screen is out of date; show the real one again.
    onError: () => void refresh(),
  });
  const removePhase = useApiMutation({
    mutationFn: ({ phase }: { phase: PhaseDto }) => deletePhase(projectId, phase.id),
    successMessage: (done, { phase }) => COPY.phaseRemoved(phase.name, done.affectedTasks),
    errorTitle: COPY.phaseRemoveFailed,
    onSuccess: refresh,
  });

  const addMilestone = useApiMutation({
    mutationFn: (values: MilestoneFormValues) =>
      createMilestone(projectId, toMilestoneInput(values)),
    successMessage: (saved) => COPY.milestoneCreated(saved.title),
    errorTitle: COPY.milestoneCreateFailed,
    onSuccess: refresh,
  });
  const editMilestone = useApiMutation({
    mutationFn: ({ milestone, values }: { milestone: MilestoneDto; values: MilestoneFormValues }) =>
      updateMilestone(projectId, milestone.id, toMilestoneInput(values)),
    successMessage: (saved) => COPY.milestoneUpdated(saved.title),
    errorTitle: COPY.milestoneUpdateFailed,
    onSuccess: refresh,
  });
  const reach = useApiMutation({
    mutationFn: ({ milestone }: { milestone: MilestoneDto }) =>
      setMilestoneReached(projectId, milestone.id, milestone.reachedAt === null),
    successMessage: (saved) =>
      saved.reachedAt ? COPY.milestoneReached(saved.title) : COPY.milestoneUnreached(saved.title),
    errorTitle: COPY.milestoneReachFailed,
    onSuccess: refresh,
  });
  const removeMilestone = useApiMutation({
    mutationFn: ({ milestone }: { milestone: MilestoneDto }) =>
      deleteMilestone(projectId, milestone.id),
    successMessage: (_d, { milestone }) => COPY.milestoneRemoved(milestone.title),
    errorTitle: COPY.milestoneRemoveFailed,
    onSuccess: refresh,
  });

  return {
    busy,
    savingPhase: addPhase.loading || editPhase.loading,
    savingMilestone: addMilestone.loading || editMilestone.loading,

    /** Adds (`phase` null) or edits a phase; resolves true when saved. An edit with no change sends nothing. */
    async savePhase(phase: PhaseDto | null, values: PhaseFormValues, initial: PhaseFormValues) {
      if (!phase) return (await addPhase.run(toPhaseInput(values))).ok;
      const patch = toPhasePatch(initial, values);
      if (Object.keys(patch).length === 0) return true;
      return (await editPhase.run({ phase, patch })).ok;
    },
    movePhase(phase: PhaseDto, direction: MoveDirection) {
      const ids = movedOrder(phases, phase.id, direction);
      if (ids) void track({ id: phase.id, action: 'move' }, () => reorder.run({ phase, ids }));
    },
    /** Opens the T2 dialog; the phase is deleted only after the user confirms. */
    confirmRemovePhase(phase: PhaseDto) {
      confirmAction({
        title: PLAN_CONFIRM_COPY.removePhaseTitle(phase.name),
        body: PLAN_CONFIRM_COPY.removePhaseBody(phase.taskCount),
        confirmLabel: PLAN_CONFIRM_COPY.removePhaseLabel,
        danger: true,
        onConfirm: () =>
          void track({ id: phase.id, action: 'remove' }, () => removePhase.run({ phase })),
      });
    },

    /** Adds (`milestone` null) or edits a milestone; resolves true when saved. */
    async saveMilestone(milestone: MilestoneDto | null, values: MilestoneFormValues) {
      if (!milestone) return (await addMilestone.run(values)).ok;
      return (await editMilestone.run({ milestone, values })).ok;
    },
    toggleReached(milestone: MilestoneDto) {
      void track({ id: milestone.id, action: 'reach' }, () => reach.run({ milestone }));
    },
    /** Opens the T2 dialog; the milestone is deleted only after the user confirms. */
    confirmRemoveMilestone(milestone: MilestoneDto) {
      confirmAction({
        title: PLAN_CONFIRM_COPY.removeMilestoneTitle(milestone.title),
        body: PLAN_CONFIRM_COPY.removeMilestoneBody,
        confirmLabel: PLAN_CONFIRM_COPY.removeMilestoneLabel,
        danger: true,
        onConfirm: () =>
          void track({ id: milestone.id, action: 'remove' }, () =>
            removeMilestone.run({ milestone }),
          ),
      });
    },
  };
}
