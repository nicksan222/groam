import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
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
      items: [{ id: 's1' }, { id: 's2' }, { id: 's3' }]
    });
    expect(blocks[2]).toMatchObject({ kind: 'comment', item: { id: 'c2' } });
    expect(blocks[3]).toMatchObject({ kind: 'system', items: [{ id: 's4' }] });
  });
});
