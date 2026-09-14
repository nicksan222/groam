import { Avatar } from '@groam/ui/components/avatar';
import Timeline from '@groam/ui/components/timeline';
import { initials } from '@groam/ui/lib/avatar';
import { MessageSquare } from 'lucide-react';

export type ComposerTimelineBadgeProps = {
  name?: string | null;
};

/** GitHub-style “you are about to comment” marker for conversation composers. */
function ComposerTimelineBadge({ name }: ComposerTimelineBadgeProps) {
  if (!name) {
    return (
      <Timeline.Badge
        aria-hidden="true"
        className="h-6 w-6 rounded-full bg-muted text-muted-foreground"
      >
        <MessageSquare />
      </Timeline.Badge>
    );
  }

  return (
    <Timeline.Badge aria-hidden="true" className="h-6 w-6 rounded-full bg-muted p-0">
      <Avatar className="size-6">
        <span className="flex size-full items-center justify-center bg-muted text-[9px] font-semibold">
          {initials(name)}
        </span>
      </Avatar>
    </Timeline.Badge>
  );
}

export { ComposerTimelineBadge };
