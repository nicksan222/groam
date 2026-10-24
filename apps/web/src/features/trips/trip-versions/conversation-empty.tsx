import { MessageSquareText } from '@groam/icons';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import Timeline from '@groam/ui/components/timeline';
import { conversationEmptyBody } from '@/features/ideas/idea-page-copy';
import type { VersionStatus } from './proposal-types';

export function ConversationEmpty({
  acceptingComments,
  status
}: {
  acceptingComments: boolean;
  status: VersionStatus;
}) {
  return (
    <Timeline.Item>
      <Timeline.Badge className="bg-muted text-muted-foreground">
        <MessageSquareText />
      </Timeline.Badge>
      <Timeline.Body className="block">
        <div className="rounded-md border bg-muted/10 px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">No comments yet</p>
          <MutedCopy size="xs" className="mx-auto mt-1 max-w-sm">
            {conversationEmptyBody(acceptingComments, status)}
          </MutedCopy>
        </div>
      </Timeline.Body>
    </Timeline.Item>
  );
}
