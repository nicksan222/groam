import { ComposerTimelineBadge as TimelineComposerBadge } from '@groam/ui/components/composer-timeline-badge';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';

/** GitHub-style “you are about to comment” marker for conversation composers. */
export function ComposerTimelineBadge({ name }: { name?: string | null }) {
  const workspace = useOptionalWorkspace();
  return <TimelineComposerBadge name={name ?? workspace?.session.user.name} />;
}
