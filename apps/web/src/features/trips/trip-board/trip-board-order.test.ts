import { arrayMove } from '@dnd-kit/sortable';
import { describe, expect, test } from 'vite-plus/test';
import { boardIssue } from '@/features/trips/testing/trip-board-fixtures';
import type { IssueStatus } from '@/types/issues';
import { applyIssueMove, issuesByLane, locateDrop } from './trip-board-order';

const ids = ['a', 'b', 'c'];
const drop = (over: Partial<Parameters<typeof locateDrop>[0]>) =>
  locateDrop({ activeId: 'x', below: false, lane: 'open', laneIds: ids, overId: 'b', ...over });

describe('locateDrop', () => {
  test('lands before the card it is over', () => {
    expect(drop({})).toMatchObject({ afterIssueId: 'b', beforeIssueId: 'a', index: 1 });
  });

  test('lands after the card it is over when below its centre', () => {
    expect(drop({ below: true })).toMatchObject({
      afterIssueId: 'c',
      beforeIssueId: 'b',
      index: 2
    });
  });

  test('lands at the top and the bottom', () => {
    expect(drop({ overId: 'a' })).toMatchObject({ afterIssueId: 'a', beforeIssueId: undefined });
    expect(drop({ below: true, overId: 'c' })).toMatchObject({
      afterIssueId: undefined,
      beforeIssueId: 'c'
    });
  });

  test('appends over the bare lane and fills an empty lane', () => {
    expect(drop({ overId: null })).toMatchObject({ afterIssueId: undefined, beforeIssueId: 'c' });
    expect(drop({ laneIds: [], overId: null })).toMatchObject({
      afterIssueId: undefined,
      beforeIssueId: undefined,
      index: 0
    });
  });

  test('moving down inside the lane takes the over card’s place, whichever half it is over', () => {
    for (const below of [false, true]) {
      expect(drop({ activeId: 'a', below, overId: 'b' })).toMatchObject({
        afterIssueId: 'c',
        beforeIssueId: 'b',
        index: 1,
        unchanged: false
      });
      expect(drop({ activeId: 'a', below, overId: 'c' })).toMatchObject({
        afterIssueId: undefined,
        beforeIssueId: 'c',
        index: 2
      });
    }
  });

  test('moving up inside the lane takes the over card’s place, whichever half it is over', () => {
    for (const below of [false, true]) {
      expect(drop({ activeId: 'c', below, overId: 'a' })).toMatchObject({
        afterIssueId: 'a',
        beforeIssueId: undefined,
        index: 0,
        unchanged: false
      });
      expect(drop({ activeId: 'c', below, overId: 'b' })).toMatchObject({
        afterIssueId: 'b',
        beforeIssueId: 'a',
        index: 1
      });
    }
  });

  test('agrees with the sortable preview for every pair of cards in a lane', () => {
    const lane = ['a', 'b', 'c', 'd'];
    for (const [from, activeId] of lane.entries()) {
      for (const [to, overId] of lane.entries()) {
        const settled = arrayMove(lane, from, to);
        const landing = drop({ activeId, laneIds: lane, overId });
        expect(settled[landing.index]).toBe(activeId);
        expect(landing.beforeIssueId).toBe(settled[landing.index - 1]);
        expect(landing.afterIssueId).toBe(settled[landing.index + 1]);
      }
    }
  });

  test('drops back on a bare own lane at the end', () => {
    expect(drop({ activeId: 'a', overId: null })).toMatchObject({
      beforeIssueId: 'c',
      index: 2,
      unchanged: false
    });
    expect(drop({ activeId: 'c', overId: null })).toMatchObject({ unchanged: true });
  });

  test('knows when the card is dropped back where it was', () => {
    expect(drop({ activeId: 'b', overId: 'b' })).toMatchObject({
      afterIssueId: 'c',
      beforeIssueId: 'a',
      unchanged: true
    });
  });

  test('another lane’s card lands beside the over card by half, not by index', () => {
    const other = { activeId: 'x', lane: 'closed' as const, laneIds: ['a', 'b'], overId: 'a' };
    expect(drop({ ...other, below: false })).toMatchObject({
      afterIssueId: 'a',
      beforeIssueId: undefined,
      index: 0,
      lane: 'closed',
      unchanged: false
    });
    expect(drop({ ...other, below: true })).toMatchObject({
      afterIssueId: 'b',
      beforeIssueId: 'a',
      index: 1
    });
  });
});

describe('applyIssueMove', () => {
  const list = [boardIssue('a'), boardIssue('b', { status: 'closed' }), boardIssue('c')];
  const order = (issues: typeof list) => issues.map(({ id, status }) => `${id}:${status}`);

  test('puts the card after its upper neighbour with the new status', () => {
    expect(
      order(
        applyIssueMove(list, {
          beforeIssueId: 'b' as never,
          issueId: 'a' as never,
          status: 'closed'
        })
      )
    ).toEqual(['b:closed', 'a:closed', 'c:open']);
  });

  test('falls back to before the lower neighbour, then to the end', () => {
    expect(
      order(
        applyIssueMove(list, { afterIssueId: 'a' as never, issueId: 'c' as never, status: 'open' })
      )
    ).toEqual(['c:open', 'a:open', 'b:closed']);
    expect(order(applyIssueMove(list, { issueId: 'a' as never, status: 'wont_do' }))).toEqual([
      'b:closed',
      'c:open',
      'a:wont_do'
    ]);
  });

  test('leaves the list alone for an unknown issue', () => {
    expect(applyIssueMove(list, { issueId: 'zzz' as never, status: 'open' })).toEqual(list);
  });
});

describe('applyIssueMove status-derived fields', () => {
  const row = (id: string, status: IssueStatus, closedAt: number | null) =>
    boardIssue(id, { closedAt, status });

  test('stamps closedAt when a card is resolved and keeps an earlier stamp', () => {
    const [moved] = applyIssueMove([row('a', 'open', null)], {
      issueId: 'a' as never,
      status: 'closed'
    });
    expect(moved?.closedAt).toEqual(expect.any(Number));
    const [wont] = applyIssueMove([row('b', 'closed', 123)], {
      issueId: 'b' as never,
      status: 'wont_do'
    });
    expect(wont?.closedAt).toBe(123);
  });

  test('clears closedAt when a card is reopened', () => {
    const [reopened] = applyIssueMove([row('a', 'closed', 123)], {
      issueId: 'a' as never,
      status: 'open'
    });
    expect(reopened?.closedAt).toBeNull();
  });
});

describe('issuesByLane', () => {
  test('groups by status keeping server order, with every lane present and its ids alongside', () => {
    const { issues, order } = issuesByLane([
      boardIssue('a'),
      boardIssue('b', { status: 'closed' }),
      boardIssue('c')
    ]);
    expect(issues.open.map(({ id }) => id)).toEqual(['a', 'c']);
    expect(order.open).toEqual(['a', 'c']);
    expect(order.closed).toEqual(['b']);
    expect(issues.wont_do).toEqual([]);
    expect(order.in_progress).toEqual([]);
  });
});
