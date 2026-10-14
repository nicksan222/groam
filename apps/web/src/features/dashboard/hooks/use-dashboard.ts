import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { useTrips, useWorkspaceTripProposals } from '@/features/trips/hooks/use-trips';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useReadyValue } from '@/lib/use-ready-value';
import {
  type DashboardPresentation,
  dashboardPresentation,
  greetingForHour
} from './dashboard-model';

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

  return { activeOrganization, greeting, presentation };
}

export type { DashboardPresentation };
