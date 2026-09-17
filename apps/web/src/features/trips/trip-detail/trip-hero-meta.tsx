import { Button } from '@groam/ui/components/button';
import { testIds } from '@/lib/test-ids';

export function TripHeroMeta({
  compact,
  hasIdeaTitle,
  isProposal,
  metaLine,
  onOpenRoster,
  role,
  subtitle,
  travelerCount,
  destinationStatus
}: {
  compact: boolean;
  destinationStatus: string;
  hasIdeaTitle: boolean;
  isProposal: boolean;
  metaLine: string;
  onOpenRoster: () => void;
  role: string;
  subtitle: string;
  travelerCount: number;
}) {
  const compactHide = compact ? 'hidden sm:block' : '';
  return (
    <>
      {hasIdeaTitle ? null : (
        <p
          className={`${compactHide} mt-1 truncate text-xs text-muted-foreground`}
          data-destination-status={destinationStatus}
          data-testid={testIds.tripDestination}
          title={subtitle}
        >
          {subtitle}
        </p>
      )}
      <p
        className={`${compactHide} mt-1 flex min-w-0 items-baseline gap-1 text-xs text-muted-foreground`}
        data-role={role}
        data-testid={testIds.tripRole}
      >
        <span className="min-w-0 truncate" title={metaLine}>
          {metaLine}
        </span>
        {isProposal ? null : (
          <>
            <span aria-hidden>·</span>
            <Button
              className="shrink-0 underline-offset-2 hover:underline"
              onClick={onOpenRoster}
              type="button"
              unstyled
            >
              {travelerCount} traveler{travelerCount === 1 ? '' : 's'}
            </Button>
          </>
        )}
      </p>
    </>
  );
}
