import { IconBadge } from '@groam/ui/components/icon-badge';
import { GitBranch } from 'lucide-react';
import { ideaStatusLabel } from '@/features/ideas/idea-status';
import type { IdeaStatus } from '@/types/ideas';

export function TripIdeaBadge({
  className,
  name,
  status = 'draft'
}: {
  className?: string;
  name: string;
  status?: IdeaStatus;
}) {
  return (
    <IconBadge className={className} icon={GitBranch}>
      <span data-idea-name={name}>{ideaStatusLabel(status)}</span>
    </IconBadge>
  );
}
