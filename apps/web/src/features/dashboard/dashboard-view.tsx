import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { useNavigate } from '@tanstack/react-router';
import { Map as MapIcon } from 'lucide-react';
import { type DashboardPresentation, useDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { Link } from '@/features/workspace/navigation/router';
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
  const navigate = useNavigate();
  const { greeting, homeAction, presentation } = useDashboard();
  if (presentation.kind === 'loading') return <PageLoading />;

  return (
    <Shell>
      <Shell.Header>
        <Shell.Title data-testid={testIds.homeDashboard}>{greeting}</Shell.Title>
        <Shell.Description>
          <span className="sm:hidden">Where a decision would help.</span>
          <span className="hidden sm:inline">
            A quick look at what your group is planning — and where a decision would help.
          </span>
        </Shell.Description>
      </Shell.Header>
      <Shell.Action
        icon={<MapIcon />}
        onClick={() => {
          if ('params' in homeAction) {
            void navigate({ params: homeAction.params, to: homeAction.to });
            return;
          }
          void navigate({ to: homeAction.to });
        }}
        text={homeAction.text}
        variant="outline"
      />
      <Shell.Content>
        <Shell.Stack className="dashboard-home" stack="page">
          <DashboardBody presentation={presentation} />
        </Shell.Stack>
      </Shell.Content>
    </Shell>
  );
}

function DashboardBody({ presentation }: { presentation: DashboardPresentation }) {
  if (presentation.kind === 'loading') {
    return <PageLoading />;
  }

  if (presentation.kind === 'empty') {
    return (
      <EmptyScreen
        border
        buttonRaw={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link to="/trips">Create a trip</Link>
            </Button>
          </div>
        }
        description="Start a trip and this home will show what needs a decision, ideas you’re shaping, and what the group already settled."
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
          <Button asChild size="sm" variant="outline">
            <Link to="/">Try again</Link>
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
