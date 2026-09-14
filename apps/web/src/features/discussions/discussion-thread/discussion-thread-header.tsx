import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { Skeleton } from '@groam/ui/components/skeleton';
import { toast } from '@groam/ui/components/toast';
import { ArrowLeft, Info, Link2, MoreHorizontal, Pencil, Users } from 'lucide-react';
import { useState } from 'react';
import { ChatAvatar } from '@/features/discussions/chat/chat-avatar';
import { DiscussionDetailsSheet } from '@/features/discussions/discussion-sheets/discussion-details-sheet';
import { DiscussionParticipantsSheet } from '@/features/discussions/discussion-sheets/discussion-participants-sheet';
import { DiscussionRenameDialog } from '@/features/discussions/discussion-sheets/discussion-rename-dialog';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type HeaderPanel = 'details' | 'participants' | 'rename';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type DiscussionThreadHeaderLoadedProps = {
  discussion: DiscussionListItem;
  isLoading?: false;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type DiscussionThreadHeaderLoadingProps = {
  discussion?: undefined;
  isLoading: true;
};

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type DiscussionThreadHeaderProps =
  | DiscussionThreadHeaderLoadedProps
  | DiscussionThreadHeaderLoadingProps;

export function DiscussionThreadHeader(props: DiscussionThreadHeaderProps) {
  if (props.isLoading) {
    return (
      <div aria-busy="true" aria-label="Opening chat…" role="status">
        <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border/70 px-2 sm:px-3">
          <Button
            asChild
            className="shrink-0 touch-manipulation md:hidden"
            size="icon"
            variant="ghost"
          >
            <Link aria-label="Back to chats" to="/chat">
              <ArrowLeft className="size-[1.125rem]" />
            </Link>
          </Button>
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1 py-1">
            <Skeleton className="h-4 w-[min(100%,12rem)]" />
            <Skeleton className="h-3 w-[min(100%,10rem)]" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-md" />
        </header>
      </div>
    );
  }

  return <DiscussionThreadHeaderReady discussion={props.discussion} />;
}

function DiscussionThreadHeaderReady({ discussion }: { discussion: DiscussionListItem }) {
  const [panel, setPanel] = useState<HeaderPanel | null>(null);
  const memberNames = discussion.members.map((member) => member.name).join(', ');

  const copyLink = async () => {
    const url = new URL(
      `/chat/${discussion.shortId ?? discussion.id}`,
      window.location.origin
    ).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Chat link copied');
    } catch {
      toast.error('Unable to copy chat link');
    }
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border/70 px-2 sm:px-3">
        <Button
          asChild
          className="shrink-0 touch-manipulation md:hidden"
          size="icon"
          variant="ghost"
        >
          <Link aria-label="Back to chats" to="/chat">
            <ArrowLeft className="size-[1.125rem]" />
          </Link>
        </Button>
        <ChatAvatar discussion={discussion} face={discussion.members[0]} size="header" />
        <div className="min-w-0 flex-1 py-1">
          <h2
            className="truncate text-[15px] font-semibold tracking-tight leading-5"
            data-testid={testIds.chatHeading}
          >
            {discussion.title}
          </h2>
          <p className="truncate text-[11px] leading-4 text-muted-foreground">{memberNames}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Thread actions"
              className="shrink-0 touch-manipulation"
              data-testid={testIds.chatActions}
              size="icon"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem
              data-testid={testIds.chatActionRename}
              onSelect={() => setPanel('rename')}
            >
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid={testIds.chatActionDetails}
              onSelect={() => setPanel('details')}
            >
              <Info />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid={testIds.chatActionParticipants}
              onSelect={() => setPanel('participants')}
            >
              <Users />
              Participants
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-testid={testIds.chatActionCopyLink}
              onSelect={() => void copyLink()}
            >
              <Link2 />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <DiscussionRenameDialog
        discussion={discussion}
        onClose={() => setPanel(null)}
        open={panel === 'rename'}
      />
      <DiscussionDetailsSheet
        discussion={discussion}
        onOpenChange={(open) => setPanel(open ? 'details' : null)}
        open={panel === 'details'}
      />
      <DiscussionParticipantsSheet
        discussion={discussion}
        onOpenChange={(open) => setPanel(open ? 'participants' : null)}
        open={panel === 'participants'}
      />
    </>
  );
}
