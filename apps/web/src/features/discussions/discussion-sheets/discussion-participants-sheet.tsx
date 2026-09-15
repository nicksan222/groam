import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@groam/ui/components/sheet';
import { displayInitials } from '@groam/ui/lib/avatar';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';

export function DiscussionParticipantsSheet({
  discussion,
  onOpenChange,
  open
}: {
  discussion: DiscussionListItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="gap-0 sm:max-w-sm" data-testid={testIds.chatParticipants}>
        <SheetHeader>
          <SheetTitle>Participants</SheetTitle>
          <SheetDescription>
            {discussion.members.length} {discussion.members.length === 1 ? 'person' : 'people'} in{' '}
            {discussion.title}.
          </SheetDescription>
        </SheetHeader>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {discussion.members.map((member) => {
            const isYou = member.userId === viewerUserId;
            return (
              <li
                className="flex items-center gap-3 rounded-md px-1 py-2"
                data-member-name={member.name}
                key={member.userId}
              >
                <Avatar className="size-8">
                  <AvatarImage alt={member.name} src={member.image ?? ''} />
                  <AvatarFallback className="text-[10px]">
                    {displayInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {member.name}
                  {isYou ? ' (you)' : ''}
                </p>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
