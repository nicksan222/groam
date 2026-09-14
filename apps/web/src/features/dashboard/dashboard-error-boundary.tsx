import Shell from '@groam/ui/components/shell/client';
import { Map as MapIcon } from 'lucide-react';
import { Component, type ReactNode } from 'react';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type DashboardErrorBoundaryProps = {
  children: ReactNode;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
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
        <Shell.Header>
          <Shell.Title>Home</Shell.Title>
          <Shell.Description>The workspace home could not be loaded.</Shell.Description>
        </Shell.Header>
        <Shell.Content
          errorMessage="Open trips to keep planning, or try again."
          errorProps={{
            buttonOnClick: () => this.setState({ failed: false }),
            buttonText: 'Try again',
            icon: MapIcon
          }}
          isError
        >
          {null}
        </Shell.Content>
      </Shell>
    );
  }
}
