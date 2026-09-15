import { Badge } from '@groam/ui/components/badge';
import { ideaStatusLabel, ideaStatusTone } from '@/features/ideas/idea-status';
import type { IdeaStatus } from '@/types/ideas';

export function IdeaStatusBadge({
  conflictCount = 0,
  status
}: {
  conflictCount?: number;
  status: IdeaStatus;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant={ideaStatusTone(status)}>{ideaStatusLabel(status)}</Badge>
      {status === 'conflicted' && conflictCount > 0 ? (
        <Badge variant="secondary">
          {conflictCount} conflict{conflictCount === 1 ? '' : 's'}
        </Badge>
      ) : null}
    </span>
  );
}
