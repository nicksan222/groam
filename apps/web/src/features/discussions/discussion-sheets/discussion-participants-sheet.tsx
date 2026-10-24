import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import { AvatarImage } from '@groam/ui/components/avatar-image';
import { ChatMemberList } from '@groam/ui/components/chat';
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
        <ChatMemberList
          className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-4"
          members={discussion.members.map((member) => ({
            avatar: (
              <Avatar aria-hidden="true" className="size-8">
                <AvatarImage alt="" src={member.image ?? ''} />
                <AvatarFallback className="text-[10px]">
                  {displayInitials(member.name)}
                </AvatarFallback>
              </Avatar>
            ),
            id: member.userId,
            name: member.userId === viewerUserId ? `${member.name} (you)` : member.name
          }))}
        />
      </SheetContent>
    </Sheet>
  );
}
