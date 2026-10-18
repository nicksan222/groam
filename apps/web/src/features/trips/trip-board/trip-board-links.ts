import type { Id } from '@groam/backend/data-model';
import type { TripBoardIdea, TripBoardIdeaLink, TripBoardIssue } from '@/types/trip-board';

/**
 * Soft hues that pair an issue with the open ideas answering it. The fill and the icon carry the
 * hue; the text stays foreground so the chip reads at 11px in both themes. `chart-3` is left out:
 * in dark mode it is the warning yellow a redundant drop uses.
 */
export const tripBoardLinkTones = [
  'bg-chart-1/15 [&>svg]:text-chart-1',
  'bg-chart-2/15 [&>svg]:text-chart-2',
  'bg-chart-4/15 [&>svg]:text-chart-4',
  'bg-chart-5/15 [&>svg]:text-chart-5'
] as const;

export const linkToneClass = (tone: number) =>
  `${tripBoardLinkTones[tone % tripBoardLinkTones.length]} text-foreground`;

/** A hue picked from the issue id alone, so a pair keeps it while other pairs come and go. */
function toneOf(issueId: string) {
  let hash = 0;
  for (const char of issueId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % tripBoardLinkTones.length;
}

/**
 * Pairs each issue with the open ideas answering it, in a hue that follows the issue alone, so it
 * survives edits, reordering, and other pairs opening or closing; `idea` is the first answering
 * idea in lane order.
 */
export function tripBoardLinks(
  ideas: TripBoardIdea[] | undefined,
  issues: TripBoardIssue[] | undefined
): ReadonlyMap<Id<'tripIssues'>, TripBoardIdeaLink> {
  const first = new Map<Id<'tripIssues'>, TripBoardIdea>();
  for (const idea of ideas ?? []) {
    if (idea.issueId && !first.has(idea.issueId)) first.set(idea.issueId, idea);
  }
  const titles = new Map(issues?.map((issue) => [issue.id, issue.title]));
  return new Map(
    [...first].map(([issueId, { id, status, title, workingTripId }]) => {
      const link: TripBoardIdeaLink = {
        idea: { id, status, title, workingTripId },
        issueTitle: titles.get(issueId),
        tone: toneOf(issueId)
      };
      return [issueId, link];
    })
  );
}

/** The issue as its board card shows it: naming the open idea it is paired with, when it has one. */
export const withLinkedIdea = (issue: TripBoardIssue, link: TripBoardIdeaLink | undefined) =>
  link && issue.idea?.id !== link.idea.id ? { ...issue, idea: link.idea } : issue;
