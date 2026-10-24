import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { Map as MapIcon, Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { SHELL_HEADER_FACT } from '@groam/ui/lib/shell-layout';
import { cn } from '@groam/ui/lib/utils';
import { buildDashboardContext } from '@/features/dashboard/hooks/dashboard-agent-context';
import { type DashboardPresentation, useDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { Link } from '@/features/workspace/navigation/router';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { testIds } from '@/lib/test-ids';
import type { TripsTurn } from '@/types/dashboard';
import { DashboardErrorBoundary } from './dashboard-error-boundary';
import { DashboardReady } from './sections/dashboard-ready';

export function DashboardView() {
  return (
    <DashboardErrorBoundary>
      <DashboardHome />
    </DashboardErrorBoundary>
  );
}

function DashboardHome() {
  const openDialog = useWorkspaceDialogs((state) => state.openDialog);
  const openCreate = () => openDialog('create-trip');
  const { activeOrganization, greeting, presentation, turn } = useDashboard();
  useSetAgentContext(
    buildDashboardContext({
      groupName: activeOrganization.name,
      trips: presentation.kind === 'ready' ? presentation.trips : [],
      turn
    })
  );

  return (
    <Shell>
      <Shell.BannerLayout>
        <Shell.Header
          actions={
            <Shell.Action
              data-testid={testIds.createTrip}
              icon={Plus}
              label="Create trip"
              onClick={openCreate}
            />
          }
          meta={
            <>
              <span className={SHELL_HEADER_FACT}>
                <span className="font-medium text-foreground">{activeOrganization.name}</span>
              </span>
              <span className={cn(SHELL_HEADER_FACT, 'max-sm:hidden')}>
                Your trips and what is waiting on you.
              </span>
            </>
          }
          title={greeting}
          titleProps={{ 'data-testid': testIds.homeDashboard }}
        />
        <Shell.PageBody>
          <Shell.Stack className="dashboard-home" stack="page">
            <DashboardBody onCreateTrip={openCreate} presentation={presentation} turn={turn} />
          </Shell.Stack>
        </Shell.PageBody>
      </Shell.BannerLayout>
    </Shell>
  );
}

function DashboardBody({
  onCreateTrip,
  presentation,
  turn
}: {
  onCreateTrip: () => void;
  presentation: DashboardPresentation;
  turn: TripsTurn | null | undefined;
}) {
  if (presentation.kind === 'loading') return <PageLoading label="Loading trips…" />;
  if (presentation.kind === 'empty') {
    return (
      <EmptyScreen
        border
        buttonOnClick={onCreateTrip}
        buttonText="Create a trip"
        description="Start a trip and this home will bring your trips and the decisions waiting on you together."
        headline="Where should we go next?"
        icon={MapIcon}
      />
    );
  }
  if (presentation.kind === 'archived') {
    return (
      <EmptyScreen
        border
        buttonRaw={
          <Button asChild variant="outline">
            <Link
              data-testid={testIds.homeArchivedTrips}
              search={{ status: 'archived' }}
              to="/trips"
            >
              See archived trips
            </Link>
          </Button>
        }
        description="Every trip in this group is archived. Restore one to pick it up again, or start a new trip."
        headline="No active trips"
        icon={MapIcon}
      />
    );
  }
  return <DashboardReady trips={presentation.trips} turn={turn} />;
}
