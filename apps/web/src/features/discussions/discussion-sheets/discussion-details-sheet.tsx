import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@groam/ui/components/sheet';
import Shell from '@groam/ui/components/shell/client';
import { ChatAvatar } from '@/features/discussions/chat/chat-avatar';
import { chatTimestamp } from '@/features/discussions/chat/chat-timestamp';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';

export function DiscussionDetailsSheet({
  discussion,
  onOpenChange,
  open
}: {
  discussion: DiscussionListItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const peopleLabel =
    discussion.members.length === 1 ? '1 person' : `${discussion.members.length} people`;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="gap-0 sm:max-w-sm" data-testid={testIds.chatDetails}>
        <SheetHeader>
          <SheetTitle>Chat details</SheetTitle>
          <SheetDescription>
            Who started this chat, who’s in it, and when it last moved.
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-start gap-3 px-4 pb-5">
          <ChatAvatar discussion={discussion} face={discussion.members[0]} size="header" />
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-[15px] font-semibold tracking-tight leading-5">
              {discussion.title}
            </p>
            <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
              {discussion.members.map((member) => member.name).join(', ')}
            </p>
          </div>
        </div>
        <dl className="space-y-4 border-t border-border/70 px-4 py-4">
          <DetailRow label="Started by" value={discussion.createdBy.name} />
          <DetailRow label="People" value={peopleLabel} />
          <DetailRow label="Last activity" value={chatTimestamp(discussion.updatedAt)} />
          {discussion.tripName && discussion.tripId ? (
            <div>
              <Shell.Eyebrow as="dt" tone="dense">
                Linked trip
              </Shell.Eyebrow>
              <dd className="mt-1 text-sm">
                <Link
                  className="text-foreground underline-offset-4 hover:underline"
                  params={{ section: 'overview', tripId: discussion.tripId }}
                  to="/trips/$tripId/$section"
                >
                  {discussion.tripName}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Shell.Eyebrow as="dt" tone="dense">
        {label}
      </Shell.Eyebrow>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
