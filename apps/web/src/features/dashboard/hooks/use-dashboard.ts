import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { useTrips, useWorkspaceTripProposals } from '@/features/trips/hooks/use-trips';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useReadyValue } from '@/lib/use-ready-value';
import {
  type DashboardPresentation,
  dashboardPresentation,
  greetingForHour
} from './dashboard-model';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type DashboardHomeAction =
  | { params: { proposalId: string }; text: string; to: '/ideas/$proposalId' }
  | { text: string; to: '/trips' };

export function useDashboard() {
  const { activeOrganization, session } = useWorkspace();
  const tripState = useTrips();
  const proposalState = useWorkspaceTripProposals();
  const rawLoading = tripState.isLoading || proposalState.isLoading;
  const rawData = rawLoading
    ? undefined
    : { proposals: proposalState.proposals, trips: tripState.trips };
  const { isLoading: pageLoading, value: latched } = useReadyValue(rawData, activeOrganization.id);
  const presentation = dashboardPresentation({
    isLoading: pageLoading,
    proposals: latched?.proposals ?? [],
    trips: latched?.trips ?? [],
    viewerUserId: session.user.id
  });
  const readyBuckets = presentation.kind === 'ready' ? presentation.buckets : null;
  const firstDecision = readyBuckets?.waitingOnYou[0];
  const homeAction: DashboardHomeAction =
    presentation.kind === 'empty'
      ? { text: 'Create a trip', to: '/trips' }
      : firstDecision
        ? {
            text: 'Next decision',
            to: '/ideas/$proposalId',
            params: { proposalId: firstDecision.id }
          }
        : { text: 'View trips', to: '/trips' };
  const greeting = greetingForHour(new Date().getHours());

  useSetAgentContext({
    capabilities: [],
    data: {
      activeTripCount: readyBuckets?.activeTrips.length ?? 0,
      groupName: activeOrganization.name,
      pendingProposalCount: readyBuckets?.yourDrafts.length ?? 0,
      reviewRequestCount: readyBuckets?.waitingOnYou.length ?? 0,
      tripsNeedingAttention:
        readyBuckets?.tripsNeedingAttention.map((trip) => ({
          id: trip.id,
          name: trip.name,
          nextAction: trip.nextAction
        })) ?? []
    },
    description: 'Summarize workspace priorities, review requests, and trips needing attention.',
    key: 'workspace:dashboard',
    title: `${activeOrganization.name} · Home`
  });

  return {
    activeOrganization,
    greeting,
    homeAction,
    presentation
  };
}

export type { DashboardPresentation };
