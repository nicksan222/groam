import { Button } from '@groam/ui/components/button';
import { CircleAlert, RotateCw } from 'lucide-react';
import { Component, type ReactNode } from 'react';

export type AssistantErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

export type AssistantErrorBoundaryState = { failed: boolean };

export class AssistantErrorBoundary extends Component<
  AssistantErrorBoundaryProps,
  AssistantErrorBoundaryState
> {
  state: AssistantErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AssistantErrorBoundaryState {
    return { failed: true };
  }

  componentDidUpdate(previousProps: AssistantErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <aside
        aria-label="Groam AI unavailable"
        className="pointer-events-auto fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-60 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-xl border border-destructive/20 bg-card p-2 shadow-xl sm:right-4 md:right-6 md:bottom-6"
        role="alert"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
          <CircleAlert className="size-4" />
        </span>
        <span className="min-w-0 px-1">
          <span className="block text-xs font-semibold">Groam AI is temporarily unavailable</span>
          <span className="block text-[10px] text-muted-foreground">
            Your workspace is still safe to use.
          </span>
        </span>
        <Button
          className="rounded-xl"
          onClick={() => this.setState({ failed: false })}
          size="sm"
          type="button"
          variant="outline"
        >
          <RotateCw /> Retry
        </Button>
      </aside>
    );
  }
}
