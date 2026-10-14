import Shell from '@groam/ui/components/shell/client';
import { IdeaStatusBadge } from '@/features/ideas/idea-status-badge';
import { testIds } from '@/lib/test-ids';

export function TripHeroTitle({
  conflictCount,
  displayTitle,
  status,
  tripId,
  tripName
}: {
  conflictCount?: number;
  displayTitle: string;
  status?: 'closed' | 'conflicted' | 'draft' | 'in_review' | 'merged';
  tripId: string;
  tripName: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Shell.Title
        className="min-w-0 break-words text-2xl leading-tight tracking-tight sm:text-[1.75rem]"
        data-testid={testIds.tripHeading}
        data-trip-id={tripId}
        data-trip-name={tripName}
        title={displayTitle}
      >
        {displayTitle}
      </Shell.Title>
      {status ? (
        <span data-testid={testIds.ideaStatusBadge}>
          <IdeaStatusBadge conflictCount={conflictCount ?? 0} status={status} />
        </span>
      ) : null}
    </div>
  );
}
