import { Button } from '@groam/ui/components/button';
import { StatusPage } from '@groam/ui/components/status-page';
import { SearchX } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

export function RouteNotFound() {
  return (
    <StatusPage
      actions={
        <Button asChild>
          <Link data-testid={testIds.notFoundHome} to="/">
            Return home
          </Link>
        </Button>
      }
      data-testid={testIds.notFound}
      icon={SearchX}
      iconClassName="text-muted-foreground"
      title="Page not found"
    >
      The page may have moved or the link may be incorrect.
    </StatusPage>
  );
}
