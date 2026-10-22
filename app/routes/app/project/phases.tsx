import { Alert, Stack, Text, Title } from '@mantine/core';
import { requireUser } from '@server/guard';
import { METRICS } from '@server/metrics/config';
import { isoDateIn } from '@server/metrics/dates';
import { toPrincipal } from '@server/project/membership.query';
import { getProjectDetail } from '@server/project/project.query';
import { getProjectPlan } from '@server/project/project-plan.query';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { data } from 'react-router';
import { MilestoneForm } from '~/components/projects/plan/MilestoneForm';
import { MilestoneList } from '~/components/projects/plan/MilestoneList';
import { PhaseForm } from '~/components/projects/plan/PhaseForm';
import { PhaseList } from '~/components/projects/plan/PhaseList';
import { PLAN_COPY } from '~/components/projects/plan/plan.copy';
import { usePlanActions } from '~/components/projects/plan/usePlanActions';
import { NOT_FOUND_TEXT } from '~/components/projects/projects.copy';
import { toJson } from '~/lib/loader-json';
import {
  fetchProjectPlan,
  type MilestoneDto,
  type PhaseDto,
  type ProjectPlan,
  planKey,
} from '~/lib/project-plan-api';
import type { Route } from './+types/phases';

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Tahapan ${loaderData?.projectName ?? 'Proyek'} — Simple PM` }];
}

// Loads and checks access itself: the layout loader runs in parallel and does not protect this one.
export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const now = new Date();
  const [project, plan] = await Promise.all([
    getProjectDetail(principal, params.projectId, now),
    getProjectPlan(principal, params.projectId),
  ]);
  // Missing, trashed and hidden projects answer the same 404 (D8), like the API does.
  if (!project || !plan) throw data(NOT_FOUND_TEXT, { status: 404 });
  return {
    projectId: project.id,
    projectName: project.name,
    // Editing the plan is part of managing the project; the page never compares a role.
    canManage: project.can.update === true,
    // "Today" is decided on the server, like the due note in the project header.
    today: isoDateIn(now, METRICS.TIME_ZONE),
    plan: toJson<ProjectPlan>(plan),
  };
}

/** The plan is fetched by react-query after the first paint, so a tab switch need not run the loader again. */
export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) {
  return currentUrl.pathname !== nextUrl.pathname;
}

type FormTarget<T> = { open: boolean; item: T | null };
const CLOSED = { open: false, item: null };

/** "Tahapan" tab: ordered phases with task progress, and the milestones between them. */
export default function ProjectPhasesPage({ loaderData }: Route.ComponentProps) {
  const { projectId, canManage, today } = loaderData;
  const plan = useQuery({
    queryKey: planKey(projectId),
    queryFn: () => fetchProjectPlan(projectId),
    initialData: loaderData.plan,
  });
  const { phases, milestones } = plan.data;
  const actions = usePlanActions(projectId, phases);
  // `item` null = adding; closing keeps `item` so the modal does not flip to "add" while it fades out.
  const [phaseForm, setPhaseForm] = useState<FormTarget<PhaseDto>>(CLOSED);
  const [milestoneForm, setMilestoneForm] = useState<FormTarget<MilestoneDto>>(CLOSED);

  return (
    <Stack gap="xl">
      <Stack gap={2}>
        <Title order={2} size="h3">
          {PLAN_COPY.title}
        </Title>
        <Text c="dimmed">{PLAN_COPY.description}</Text>
      </Stack>
      {plan.isError && (
        <Alert color="danger" icon={<FiAlertCircle size="1.25em" aria-hidden />}>
          {PLAN_COPY.loadFailed}
        </Alert>
      )}
      <PhaseList
        phases={phases}
        canManage={canManage}
        busy={actions.busy}
        onAdd={() => setPhaseForm({ open: true, item: null })}
        onEdit={(item) => setPhaseForm({ open: true, item })}
        onMove={actions.movePhase}
        onRemove={actions.confirmRemovePhase}
      />
      <MilestoneList
        milestones={milestones}
        phases={phases}
        today={today}
        canManage={canManage}
        busy={actions.busy}
        onAdd={() => setMilestoneForm({ open: true, item: null })}
        onEdit={(item) => setMilestoneForm({ open: true, item })}
        onToggleReached={actions.toggleReached}
        onRemove={actions.confirmRemoveMilestone}
      />
      {canManage && (
        <>
          <PhaseForm
            opened={phaseForm.open}
            phase={phaseForm.item}
            loading={actions.savingPhase}
            onClose={() => setPhaseForm((f) => ({ ...f, open: false }))}
            onSubmit={(values, initial) => actions.savePhase(phaseForm.item, values, initial)}
          />
          <MilestoneForm
            opened={milestoneForm.open}
            milestone={milestoneForm.item}
            phases={phases}
            loading={actions.savingMilestone}
            onClose={() => setMilestoneForm((f) => ({ ...f, open: false }))}
            onSubmit={(values) => actions.saveMilestone(milestoneForm.item, values)}
          />
        </>
      )}
    </Stack>
  );
}
