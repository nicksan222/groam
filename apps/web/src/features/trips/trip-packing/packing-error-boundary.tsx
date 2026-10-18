import { Button } from '@groam/ui/components/button';
import { ErrorWell } from '@groam/ui/components/error-well';
import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Keeps a failed Packing query (a dropped connection or a rejected read) to its own card: the
 * other card keeps working, and "Try again" mounts the card afresh to re-subscribe.
 */
export class PackingErrorBoundary extends Component<
  { children: ReactNode; what: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Packing: could not show ${this.props.what}`, error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorWell className="flex flex-col items-center justify-center gap-3">
        <p>We couldn&apos;t load {this.props.what}.</p>
        <Button onClick={() => this.setState({ failed: false })} size="sm" variant="outline">
          Try again
        </Button>
      </ErrorWell>
    );
  }
}
