import type { Id } from '@groam/backend/data-model';
import Shell from '@groam/ui/components/shell/client';
import { Users } from 'lucide-react';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';

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
    <Shell.NoticeBanner
      aria-label="Someone else’s idea"
      className={className}
      description={`You're viewing ${idea.proposal.author.name}'s idea. Only they can edit it.`}
      icon={Users}
      title="Someone else’s idea"
    />
  );
}
