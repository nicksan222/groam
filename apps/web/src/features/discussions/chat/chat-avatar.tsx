import { StackedAvatar } from '@groam/ui/components/stacked-avatar';
import { avatarClasses, displayInitials } from '@groam/ui/lib/avatar';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';

/**
 * A chat's mark: one face for a chat of one, else the first two members offset on a diagonal,
 * each in their own hue. Decorative; the chat's title names it.
 */
export function ChatAvatar({
  discussion,
  face,
  ringClassName,
  size
}: {
  discussion: DiscussionListItem;
  face: DiscussionListItem['members'][number] | undefined;
  /** The second face's ring takes the surface the mark sits on, so it reads as cut out of it. */
  ringClassName?: string;
  size: 'list' | 'header';
}) {
  const first = { image: face?.image, name: face?.name ?? discussion.title };
  const second = discussion.members.find((member) => member.userId !== face?.userId);
  const faces = [first, ...(second ? [second] : [])].map((member) => ({
    alt: '',
    fallback: displayInitials(member.name),
    fallbackClassName: avatarClasses(member.name),
    src: member.image
  }));

  return (
    <StackedAvatar
      aria-hidden
      className="dark:saturate-150"
      faces={faces}
      ringClassName={ringClassName}
      size={size === 'list' ? 'md' : 'sm'}
    />
  );
}
