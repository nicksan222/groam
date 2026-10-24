import { useTrips } from '@/features/trips/hooks/use-trips';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useReadyValue } from '@/lib/use-ready-value';
import {
  type DashboardPresentation,
  dashboardPresentation,
  greetingForHour
} from './dashboard-model';
import { useTripsTurn } from './use-trips-turn';

export function useDashboard() {
  const { activeOrganization } = useWorkspace();
  const active = useTrips({ includeArchived: false });
  // Only when nothing is active: are there archived trips, or none at all?
  const askAll = !active.isLoading && active.trips.length === 0;
  const all = useTrips(askAll ? undefined : 'skip');
  const loaded = !active.isLoading && !(askAll && all.isLoading);
  const { isLoading, value: lists } = useReadyValue(
    loaded ? { activeTrips: active.trips, anyTrips: askAll ? all.trips : active.trips } : undefined,
    activeOrganization.id
  );
  const presentation = dashboardPresentation({
    activeTrips: lists?.activeTrips ?? [],
    anyTrips: lists?.anyTrips ?? [],
    isLoading
  });
  // What waits on the viewer is only asked once there are trips to show it beside.
  const turn = useTripsTurn(presentation.kind === 'ready');
  const greeting = greetingForHour(new Date().getHours());

  return { activeOrganization, greeting, presentation, turn };
}

export type { DashboardPresentation };
