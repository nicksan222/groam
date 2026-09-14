import { Button } from '@groam/ui/components/button';
import { StatusPage } from '@groam/ui/components/status-page';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <StatusPage
      actions={
        <>
          <Button data-testid={testIds.workspaceErrorRetry} onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Home</Link>
          </Button>
        </>
      }
      icon={AlertTriangle}
      iconClassName="text-destructive"
      title="Something went wrong"
    >
      {error instanceof Error ? error.message : 'An unexpected error occurred.'}
    </StatusPage>
  );
}
