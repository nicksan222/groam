import { Link2, Search, Users } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import { recordListTitleClassName } from '@groam/ui/lib/record-list';
import { relativeIssueDate } from '@/features/issues/hooks/issue-relative-date';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';

export function ResearchListRow({
  onOpen,
  research
}: {
  onOpen: (research: ResearchSummary) => void;
  research: ResearchSummary;
}) {
  const message = research.lastMessage;
  return (
    <RecordListItem
      data-research-id={research.id}
      data-testid={testIds.researchCard}
      icon={<Search aria-hidden className="text-muted-foreground" />}
      title={
        <h4 title={research.title}>
          <Button className={recordListTitleClassName} onClick={() => onOpen(research)} unstyled>
            {research.title}
          </Button>
        </h4>
      }
      description={
        <span title={research.brief ?? undefined}>
          <span>{research.brief ?? 'No brief'}</span>
          <span aria-hidden className="mx-1.5">
            ·
          </span>
          <span title={message?.text}>
            {message ? `${message.authorName}: ${message.text}` : 'No messages yet'}
          </span>
        </span>
      }
      metadata={
        research.unread ? (
          <RecordListBadge data-testid={testIds.researchUnread}>Unread</RecordListBadge>
        ) : undefined
      }
      badges={
        <>
          <time
            className="text-xs tabular-nums text-muted-foreground"
            dateTime={new Date(research.updatedAt).toISOString()}
            title={new Date(research.updatedAt).toLocaleString()}
          >
            {relativeIssueDate(research.updatedAt)}
          </time>
          <RecordListBadge aria-label={`${research.participantCount} people`} className="gap-1">
            <Users aria-hidden />
            {research.participantCount}
          </RecordListBadge>
          <RecordListBadge aria-label={`${research.linkCount} links`} className="gap-1">
            <Link2 aria-hidden />
            {research.linkCount}
          </RecordListBadge>
        </>
      }
    />
  );
}
