import { memo } from 'react';
import { IssueCard } from '@/features/issues/shared/issue-card';
import type { TripBoardIdeaLink, TripBoardIssue } from '@/types/trip-board';
import { assignMode } from './trip-board-assign';
import { TripBoardAssignee } from './trip-board-assignee';
import { linkToneClass, withLinkedIdea } from './trip-board-links';

const placement = { avatar: 'avatar', hover: 'hover', static: 'avatar' } as const;

/**
 * An issue card with its assignee control, its idea chip tinted to match the idea it is paired with. It is memoised on the issue itself, so a drag that
 * only moves the lane's preview slot never re-renders the cards.
 */
export const TripBoardIssueCard = memo(function TripBoardIssueCard({
  issue,
  link,
  quiet
}: {
  issue: TripBoardIssue;
  /** Its pairing with the open ideas in the Ideas lane, if it has any. */
  link?: TripBoardIdeaLink;
  quiet: boolean;
}) {
  const mode = assignMode(issue);
  // The issue names its newest idea, which may be closed while an older one is still open: the
  // chip then names the open one, so its words and its hue agree.
  const shown = withLinkedIdea(issue, link);
  return (
    <IssueCard
      assigneeAt={placement[mode]}
      assigneeSlot={mode === 'static' ? undefined : <TripBoardAssignee issue={issue} />}
      className={quiet ? 'bg-card/60' : undefined}
      data-link-tone={link?.tone}
      ideaChipClassName={link ? linkToneClass(link.tone) : undefined}
      issue={shown}
    />
  );
});
