import { StackedAvatar } from '@groam/ui/components/stacked-avatar';
import { displayInitials } from '@groam/ui/lib/avatar';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';

export function ChatAvatar({
  discussion,
  face,
  size
}: {
  discussion: DiscussionListItem;
  face: DiscussionListItem['members'][number] | undefined;
  size: 'list' | 'header';
}) {
  const faces =
    discussion.members.length > 1
      ? [
          {
            alt: face?.name ?? '',
            fallback: displayInitials(face?.name ?? discussion.title),
            src: face?.image
          },
          {
            alt: discussion.members[1]?.name ?? '',
            fallback: displayInitials(discussion.members[1]?.name ?? discussion.title),
            src: discussion.members[1]?.image
          }
        ]
      : [
          {
            alt: face?.name ?? discussion.title,
            fallback: displayInitials(face?.name ?? discussion.title),
            src: face?.image
          }
        ];

  return <StackedAvatar faces={faces} size={size === 'list' ? 'md' : 'sm'} />;
}
