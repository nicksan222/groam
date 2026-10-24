import { describe, expect, test } from 'vite-plus/test';
import type { QueueItem } from '@/types/queue';
import { leftOutByKind, mandatoryProgress, yourTurnItems, yourTurnLimit } from './your-turn';

function item(id: string, overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    href: { params: { issueId: id }, to: '/issues/$issueId' },
    id,
    kind: 'issue',
    settled: false,
    status: { label: 'Open', tone: 'info' },
    title: `Item ${id}`,
    updatedAt: 1,
    who: 'Opened by Sam',
    yourTurn: true,
    ...overrides
  } as QueueItem;
}

describe('yourTurnItems', () => {
  test('keeps only the open items that wait on the viewer, in queue order', () => {
    const items = [
      item('a'),
      item('b', { yourTurn: false }),
      item('c', { settled: true }),
      item('d', { kind: 'idea' })
    ];
    expect(yourTurnItems(items).map((entry) => entry.id)).toEqual(['a', 'd']);
  });

  test('names an unvoted poll like any other item', () => {
    const poll = { ...item('p'), kind: 'poll' } as QueueItem;
    expect(yourTurnItems([poll]).map((entry) => entry.id)).toEqual(['p']);
  });

  test('is empty when nothing waits on the viewer', () => {
    expect(yourTurnItems([item('a', { yourTurn: false })])).toEqual([]);
    expect(yourTurnItems([])).toEqual([]);
  });

  test('allows three rows on the strip', () => {
    expect(yourTurnLimit).toBe(3);
  });
});

describe('leftOutByKind', () => {
  const entries = (kinds: Array<'idea' | 'issue' | 'poll'>) =>
    yourTurnItems(kinds.map((kind, index) => item(`e${index}`, { kind })));

  test('counts what lies past the strip, by the section that lists it', () => {
    expect(
      leftOutByKind(entries(['issue', 'idea', 'issue', 'idea', 'idea', 'issue', 'poll']))
    ).toEqual({ ideas: 2, issues: 1, polls: 1 });
  });

  test('is zero when everything fits', () => {
    expect(leftOutByKind(entries(['issue', 'idea']))).toEqual({ ideas: 0, issues: 0, polls: 0 });
  });
});

describe('mandatoryProgress', () => {
  const issue = (labels: string[], status: string) => ({ labels, status }) as never;

  test.each([
    ['still loading', undefined],
    ['no issues', []],
    ['no mandatory issues', [issue([], 'open'), issue(['travel'], 'closed')]]
  ])('is null while %s', (_name, issues) => {
    expect(mandatoryProgress(issues)).toBeNull();
  });

  test.each([
    ['none done', ['open', 'in_progress'], { done: 0, total: 2 }],
    ['some done', ['closed', 'open', 'wont_do'], { done: 1, total: 3 }],
    ['all done', ['closed', 'closed'], { done: 2, total: 2 }]
  ])('counts closed mandatory issues when %s', (_name, statuses, expected) => {
    const issues = [...statuses.map((status) => issue(['mandatory'], status)), issue([], 'closed')];
    expect(mandatoryProgress(issues)).toEqual(expected);
  });
});
