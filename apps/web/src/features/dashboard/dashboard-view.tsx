import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { Map as MapIcon, Plus } from 'lucide-react';
import { type DashboardPresentation, useDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { useTripsSidebarUi } from '@/features/trips/hooks/use-trips-sidebar-ui';
import { testIds } from '@/lib/test-ids';
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
  const { openCreate } = useTripsSidebarUi();
  const { activeOrganization, greeting, presentation } = useDashboard();
  if (presentation.kind === 'loading') return <PageLoading />;

  return (
    <Shell>
      <Shell.Header>
        <Shell.Title data-testid={testIds.homeDashboard}>{greeting}</Shell.Title>
        <Shell.Description>
          <span className="font-medium text-foreground">{activeOrganization.name}</span>
          <span className="hidden sm:inline"> · Pick up the next useful planning step.</span>
        </Shell.Description>
      </Shell.Header>
      <Shell.Action icon={<Plus />} onClick={openCreate} text="Create trip" />
      <Shell.Content>
        <Shell.Stack className="dashboard-home" stack="page">
          <DashboardBody onCreateTrip={openCreate} presentation={presentation} />
        </Shell.Stack>
      </Shell.Content>
    </Shell>
  );
}

function DashboardBody({
  onCreateTrip,
  presentation
}: {
  onCreateTrip: () => void;
  presentation: DashboardPresentation;
}) {
  if (presentation.kind === 'loading') return <PageLoading />;
  if (presentation.kind === 'empty') {
    return (
      <EmptyScreen
        border
        buttonOnClick={onCreateTrip}
        buttonText="Create a trip"
        description="Start a trip and this home will bring the group’s next decisions, active plans, and ideas together."
        headline="Where should we go next?"
        icon={MapIcon}
      />
    );
  }
  if (presentation.kind === 'error') {
    return (
      <EmptyScreen
        border
        buttonRaw={
          <Button onClick={() => window.location.reload()} size="sm" variant="outline">
            Try again
          </Button>
        }
        description={presentation.message || 'Something went wrong loading this home.'}
        headline="Couldn't load home"
        icon={MapIcon}
      />
    );
  }
  return <DashboardReady buckets={presentation.buckets} />;
}
