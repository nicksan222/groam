import { Info, Link2, Pencil, Users } from '@groam/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { toast } from '@groam/ui/components/toast';
import { type ReactNode, useState } from 'react';
import { DiscussionDetailsSheet } from '@/features/discussions/discussion-sheets/discussion-details-sheet';
import { DiscussionParticipantsSheet } from '@/features/discussions/discussion-sheets/discussion-participants-sheet';
import { DiscussionRenameDialog } from '@/features/discussions/discussion-sheets/discussion-rename-dialog';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { absoluteHref } from '@/lib/navigation/base-path';
import { testIds } from '@/lib/test-ids';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type ThreadPanel = 'details' | 'participants' | 'rename';

/**
 * A chat's actions menu (rename, details, participants, copy link) and the sheets it opens.
 * `trigger` renders the menu button, so a page header and a pane bar can each draw their own;
 * `leading` renders before it and may open the participants sheet (a face pile does).
 */
export function DiscussionThreadMenu({
  discussion,
  leading,
  trigger
}: {
  discussion: DiscussionListItem;
  leading?: (openParticipants: () => void) => ReactNode;
  trigger: (props: { 'data-testid': string }) => ReactNode;
}) {
  const [panel, setPanel] = useState<ThreadPanel | null>(null);

  const copyLink = async () => {
    const url = absoluteHref(`/chat/${discussion.shortId}`);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Chat link copied');
    } catch {
      toast.error('Unable to copy chat link');
    }
  };

  return (
    <>
      {leading?.(() => setPanel('participants'))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger({ 'data-testid': testIds.chatActions })}
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
