import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vite-plus/test';
import { groupIssueTimeline } from './group-issue-timeline';

function comment(id: string, kind: 'comment' | 'system', content = id) {
  return {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    content,
    createdAt: Date.UTC(2026, 7, 18),
    id: id as Id<'tripIssueComments'>,
    kind,
    updatedAt: Date.UTC(2026, 7, 18)
  };
}

describe('groupIssueTimeline', () => {
  test('keeps comments as individual blocks', () => {
    expect(groupIssueTimeline([comment('c1', 'comment'), comment('c2', 'comment')])).toEqual([
      { kind: 'comment', item: comment('c1', 'comment') },
      { kind: 'comment', item: comment('c2', 'comment') }
    ]);
  });

  test('clusters consecutive system events', () => {
    const blocks = groupIssueTimeline([
      comment('c1', 'comment'),
      comment('s1', 'system', 'assigned A'),
      comment('s2', 'system', 'unassigned A'),
      comment('s3', 'system', 'assigned B'),
      comment('c2', 'comment'),
      comment('s4', 'system', 'assigned C')
    ]);

    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toMatchObject({ kind: 'comment', item: { id: 'c1' } });
    expect(blocks[1]).toMatchObject({
      kind: 'system',
      items: [{ item: { id: 's1' } }, { item: { id: 's2' } }, { item: { id: 's3' } }]
    });
    expect(blocks[2]).toMatchObject({ kind: 'comment', item: { id: 'c2' } });
    expect(blocks[3]).toMatchObject({ kind: 'system', items: [{ item: { id: 's4' } }] });
  });

  test("reads a person's change back into its parts", () => {
    const [block] = groupIssueTimeline([
      comment('s1', 'system', 'Alex Morgan assigned this to Sam Planner')
    ]);
    expect(block).toMatchObject({
      items: [{ event: { kind: 'assigned', name: 'Sam Planner' } }],
      kind: 'system'
    });
  });

  test('gives automatic status changes their own block with the reason', () => {
    const blocks = groupIssueTimeline([
      comment('s1', 'system', 'assigned A'),
      comment('s2', 'system', 'Resolved automatically: The trip has a destination'),
      comment('s3', 'system', 'Reopened automatically: The trip has a destination no longer holds'),
      comment('s4', 'system', 'assigned B')
    ]);

    expect(blocks).toMatchObject([
      { kind: 'system', items: [{ event: null, item: { id: 's1' } }] },
      { auto: { change: 'resolved', label: 'The trip has a destination' }, kind: 'auto' },
      { auto: { change: 'reopened', label: 'The trip has a destination' }, kind: 'auto' },
      { kind: 'system', items: [{ item: { id: 's4' } }] }
    ]);
  });
});
