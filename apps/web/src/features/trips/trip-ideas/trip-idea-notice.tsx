import type { Id } from '@groam/backend/data-model';
import { Users } from '@groam/icons';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import { TripInlineNotice } from '@/features/trips/trip-detail/trip-inline-notice';

export function TripIdeaNotice({
  className
}: {
  authorName?: string;
  ideaName?: string;
  canEdit?: boolean;
  className?: string;
  compact?: boolean;
  sharedTripName?: string;
  sourceTripId?: Id<'trips'>;
  status?: 'closed' | 'conflicted' | 'draft' | 'in_review' | 'merged';
  workingTripId?: Id<'trips'>;
}) {
  const idea = useOptionalIdeaContext();
  if (!idea?.proposal || idea.isViewerAuthor) return null;

  return (
    <TripInlineNotice className={className} icon={Users} title="Someone else’s idea">
      {`You're viewing ${idea.proposal.author.name}'s idea. Only they can edit it.`}
    </TripInlineNotice>
  );
}
