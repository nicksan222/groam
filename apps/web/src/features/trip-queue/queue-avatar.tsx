import { Sparkles } from '@groam/icons';
import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { avatarClasses, initials } from '@groam/ui/lib/avatar';
import { cn } from '@groam/ui/lib/utils';
import type { QueuePerson } from '@/types/queue';

/**
 * Who holds or made the item: initials ("You" for the viewer), a sparkle for an agent, a dashed
 * empty circle for nobody. `label` names the role for screen readers and the tooltip.
 */
export function QueueAvatar({ label, person }: { label: string; person: QueuePerson | null }) {
  if (!person) {
    return (
      <span
        aria-label={label}
        className="box-border size-[22px] flex-none rounded-full border-[1.5px] border-dashed border-input"
        role="img"
        title={label}
      />
    );
  }
  if (person.kind === 'agent') {
    return (
      <span
        aria-label={label}
        className="relative flex size-[22px] flex-none items-center justify-center rounded-full bg-muted text-muted-foreground"
        role="img"
        title={label}
      >
        <Sparkles aria-hidden className="size-3.5" />
      </span>
    );
  }
  return (
    <Avatar aria-label={label} className="size-[22px] flex-none" role="img" title={label}>
      <AvatarFallback
        className={cn(
          'text-[9px] font-medium',
          avatarClasses(person.name),
          person.mine && 'text-[8px]'
        )}
      >
        {person.mine ? 'You' : initials(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}
