import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { MapPinned } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

export function TripNotFound() {
  return (
    <EmptyScreen
      border
      buttonRaw={
        <Button asChild size="sm">
          <Link data-testid={testIds.notFoundHome} to="/trips">
            Back to trips
          </Link>
        </Button>
      }
      className="m-6"
      description="This trip may have been removed, or you might not have access."
      headline="Trip not found"
      icon={MapPinned}
    />
  );
}
