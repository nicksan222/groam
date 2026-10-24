import { parseIssueEvent } from '@groam/backend/convex/modules/travel/issues/events';
import type { IssueEvent } from '@/types/issues';
import type { IssueDetailData } from './issue-detail-data';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
type IssueTimelineItem = IssueDetailData['comments'][number];

/**
 * Collapse consecutive system events so assignment spam shares one rail marker, each read back
 * into its parts. A checked condition moving the issue by itself gets its own block, so the
 * timeline can say why.
 */
export function groupIssueTimeline(comments: IssueDetailData['comments']) {
  const blocks: Array<
    | { kind: 'comment'; item: IssueTimelineItem }
    | {
        kind: 'system';
        items: Array<{
          event: Exclude<IssueEvent, { kind: 'auto' }> | null;
          item: IssueTimelineItem;
        }>;
      }
    | { auto: Extract<IssueEvent, { kind: 'auto' }>; item: IssueTimelineItem; kind: 'auto' }
  > = [];

  for (const item of comments) {
    if (item.kind !== 'system') {
      blocks.push({ kind: 'comment', item });
      continue;
    }
    const event = parseIssueEvent(item.author.name, item.content);
    if (event?.kind === 'auto') {
      blocks.push({ auto: event, item, kind: 'auto' });
      continue;
    }
    const last = blocks.at(-1);
    if (last?.kind === 'system') last.items.push({ event, item });
    else blocks.push({ kind: 'system', items: [{ event, item }] });
  }
  return blocks;
}
