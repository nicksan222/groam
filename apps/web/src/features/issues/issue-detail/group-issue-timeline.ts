import type { IssueDetailData } from './issue-detail-data';

/** Collapse consecutive system events so assignment spam shares one rail marker. */
export function groupIssueTimeline(comments: IssueDetailData['comments']) {
  const blocks: Array<
    | { kind: 'comment'; item: IssueDetailData['comments'][number] }
    | { kind: 'system'; items: Array<IssueDetailData['comments'][number]> }
  > = [];

  for (const item of comments) {
    if (item.kind === 'system') {
      const last = blocks.at(-1);
      if (last?.kind === 'system') {
        last.items.push(item);
        continue;
      }
      blocks.push({ kind: 'system', items: [item] });
      continue;
    }
    blocks.push({ kind: 'comment', item });
  }
  return blocks;
}
