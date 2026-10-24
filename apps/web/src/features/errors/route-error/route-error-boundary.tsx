import { Component, type ReactNode } from 'react';
import { RouteError } from '@/features/errors/route-error/route-error';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type RouteErrorBoundaryProps = {
  children: ReactNode;
  /** The page URL; a navigation clears the error, as a new page starts over. */
  location: string;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type RouteErrorBoundaryState = {
  error: unknown;
  location: string;
};

/** Shows the route error page for a page that failed to render, until retry or navigation. */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null, location: this.props.location };

  static getDerivedStateFromError(error: unknown): Partial<RouteErrorBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: RouteErrorBoundaryProps,
    state: RouteErrorBoundaryState
  ): Partial<RouteErrorBoundaryState> | null {
    return props.location === state.location ? null : { error: null, location: props.location };
  }

  render() {
    if (this.state.error === null) return this.props.children;
    return <RouteError error={this.state.error} reset={() => this.setState({ error: null })} />;
  }
}
