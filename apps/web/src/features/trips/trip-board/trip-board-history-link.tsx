import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { History } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

/** Footer of Done: everything the group has settled, applied ideas included. */
export function TripBoardHistoryLink({ tripId }: { tripId: Id<'trips'> }) {
  return (
    <Button
      asChild
      className="text-muted-foreground"
      data-testid={testIds.tripHistory}
      size="sm"
      variant="ghost"
    >
      <Link params={{ section: 'activity', tripId }} to="/trips/$tripId/$section">
        <History />
        Full history
      </Link>
    </Button>
  );
}
