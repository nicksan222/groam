import { Map as MapIcon } from '@groam/icons';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import Shell from '@groam/ui/components/shell/client';
import { Component, type ReactNode } from 'react';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type DashboardErrorBoundaryProps = {
  children: ReactNode;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type DashboardErrorBoundaryState = {
  failed: boolean;
};

export class DashboardErrorBoundary extends Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  state: DashboardErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): DashboardErrorBoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <Shell>
        <Shell.BannerLayout>
          <Shell.Header meta="The workspace home could not be loaded." title="Home" />
          <Shell.PageBody>
            <EmptyScreen
              buttonOnClick={() => this.setState({ failed: false })}
              buttonText="Try again"
              description="Open trips to keep planning, or try again."
              headline="Something went wrong"
              icon={MapIcon}
              iconClassName="text-destructive"
            />
          </Shell.PageBody>
        </Shell.BannerLayout>
      </Shell>
    );
  }
}
