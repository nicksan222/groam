import { Component, type ReactNode } from 'react';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type DashboardSectionBoundaryProps = {
  children: ReactNode;
  /** Rendered when the section's data source fails; hidden by default. */
  fallback?: ReactNode;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type DashboardSectionBoundaryState = {
  failed: boolean;
};

/** Keeps one failing data source from taking the whole home down; the section just hides. */
export class DashboardSectionBoundary extends Component<
  DashboardSectionBoundaryProps,
  DashboardSectionBoundaryState
> {
  state: DashboardSectionBoundaryState = { failed: false };

  static getDerivedStateFromError(): DashboardSectionBoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return this.props.fallback ?? null;
  }
}
